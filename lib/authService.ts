import {
  signInWithPopup,
  signInWithRedirect,
  signInWithPhoneNumber,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  applyActionCode,
  RecaptchaVerifier,
  type ConfirmationResult,
  type Auth,
  type User,
} from 'firebase/auth';
import { auth, googleProvider } from '../firebaseConfig';

const REDIRECT_ERROR_CODES = new Set<string>([
  'auth/popup-blocked',
  'auth/popup-closed-by-user',
  'auth/cancelled-popup-request',
  'auth/operation-not-supported-in-this-environment',
  'auth/internal-error',
]);

/**
 * Servicio de autenticación centralizado
 */
export const authService = {
  /**
   * Iniciar sesión con Google
   */
  async signInWithGoogle(): Promise<void> {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      if (error?.code === 'auth/requests-from-referrer-blocked') {
        console.error([
          'Firebase Authentication rejected the request because of the API key HTTP referrer restrictions.',
          'Add the domains you use locally (for example http://localhost:3000) and in production to the allowed list for the Web API key.',
          'Firebase Console > Project settings > General > Your apps > Firebase SDK snippet > Web API Key > Manage in Google Cloud Console.',
        ].join(' '));
      }
      if (typeof window !== 'undefined') {
        const code = typeof error?.code === 'string' ? error.code : undefined;
        if (!code || REDIRECT_ERROR_CODES.has(code)) {
          await signInWithRedirect(auth, googleProvider);
          return;
        }
      }
      throw error;
    }
  },

  /**
   * Crear verificador de reCAPTCHA invisible
   */
  createRecaptchaVerifier(containerId: string): RecaptchaVerifier {
    return new RecaptchaVerifier(auth, containerId, {
      size: 'invisible',
      callback: () => {
        // reCAPTCHA resuelto - permite proceder
      },
      'expired-callback': () => {
        console.warn('reCAPTCHA expirado');
      },
    });
  },

  /**
   * Iniciar autenticación con número de teléfono
   * @param phoneNumber - Número con formato internacional (ej: +521234567890)
   * @param recaptchaVerifier - Verificador de reCAPTCHA
   * @returns ConfirmationResult para confirmar código
   */
  async startPhoneLogin(
    phoneNumber: string,
    recaptchaVerifier: RecaptchaVerifier
  ): Promise<ConfirmationResult> {
    try {
      const confirmationResult = await signInWithPhoneNumber(
        auth,
        phoneNumber,
        recaptchaVerifier
      );
      return confirmationResult;
    } catch (error: any) {
      // Limpiar reCAPTCHA en caso de error
      recaptchaVerifier.clear();
      throw this.handlePhoneAuthError(error);
    }
  },

  /**
   * Confirmar código de verificación SMS
   * @param confirmationResult - Resultado de startPhoneLogin
   * @param code - Código de 6 dígitos recibido por SMS
   */
  async confirmPhoneCode(
    confirmationResult: ConfirmationResult,
    code: string
  ): Promise<void> {
    try {
      await confirmationResult.confirm(code);
    } catch (error: any) {
      throw this.handlePhoneAuthError(error);
    }
  },

  /**
   * Manejar errores de Phone Auth y devolver mensajes en español
   */
  handlePhoneAuthError(error: any): Error {
    const code = error?.code || '';
    let message = 'Error al autenticar con teléfono';

    switch (code) {
      case 'auth/invalid-phone-number':
        message = 'Número de teléfono inválido. Verifica el formato.';
        break;
      case 'auth/missing-phone-number':
        message = 'Por favor ingresa un número de teléfono.';
        break;
      case 'auth/quota-exceeded':
        message = 'Se excedió el límite de SMS. Intenta más tarde.';
        break;
      case 'auth/too-many-requests':
        message = 'Demasiados intentos. Por favor espera un momento.';
        break;
      case 'auth/invalid-verification-code':
        message = 'Código de verificación incorrecto.';
        break;
      case 'auth/code-expired':
        message = 'El código ha expirado. Solicita uno nuevo.';
        break;
      case 'auth/session-expired':
        message = 'La sesión ha expirado. Solicita un nuevo código.';
        break;
      case 'auth/network-request-failed':
        message = 'Error de conexión. Verifica tu internet.';
        break;
      default:
        message = error?.message || 'Error desconocido';
    }

    const customError = new Error(message);
    customError.name = code;
    return customError;
  },

  /**
   * Iniciar sesión con Email y Contraseña
   * @param email - Email del usuario
   * @param password - Contraseña
   */
  async signInWithEmail(email: string, password: string): Promise<void> {
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error: any) {
      throw this.handleEmailAuthError(error);
    }
  },

  /**
   * Crear cuenta con Email y Contraseña
   * @param email - Email del usuario
   * @param password - Contraseña (mínimo 6 caracteres)
   */
  async createAccountWithEmail(email: string, password: string): Promise<User> {
    try {
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      // Enviar email de verificación automáticamente
      await this.sendVerificationEmail(credential.user);
      return credential.user;
    } catch (error: any) {
      throw this.handleEmailAuthError(error);
    }
  },

  /**
   * Enviar email de verificación al usuario actual
   * @param user - Usuario de Firebase (opcional, usa el actual si no se proporciona)
   */
  async sendVerificationEmail(user?: User): Promise<void> {
    try {
      const targetUser = user || auth.currentUser;
      if (!targetUser) {
        throw new Error('No hay usuario autenticado');
      }
      if (targetUser.emailVerified) {
        throw new Error('El correo ya está verificado');
      }
      await sendEmailVerification(targetUser);
    } catch (error: any) {
      const message = error?.message || 'Error al enviar email de verificación';
      throw new Error(message);
    }
  },

  /**
   * Verificar código de verificación de email
   * @param actionCode - Código de acción recibido en el email
   */
  async verifyEmailCode(actionCode: string): Promise<void> {
    try {
      await applyActionCode(auth, actionCode);
      // Recargar el usuario para actualizar emailVerified
      await auth.currentUser?.reload();
    } catch (error: any) {
      throw new Error('Código de verificación inválido o expirado');
    }
  },

  /**
   * Manejar errores de Email Auth y devolver mensajes en español
   */
  handleEmailAuthError(error: any): Error {
    const code = error?.code || '';
    let message = 'Error al autenticar con correo';

    switch (code) {
      case 'auth/invalid-email':
        message = 'Correo electrónico inválido.';
        break;
      case 'auth/user-disabled':
        message = 'Esta cuenta ha sido deshabilitada.';
        break;
      case 'auth/user-not-found':
        message = 'No existe una cuenta con este correo.';
        break;
      case 'auth/wrong-password':
        message = 'Contraseña incorrecta.';
        break;
      case 'auth/email-already-in-use':
        message = 'Este correo ya está registrado. Inicia sesión.';
        break;
      case 'auth/weak-password':
        message = 'La contraseña debe tener al menos 6 caracteres.';
        break;
      case 'auth/operation-not-allowed':
        message = 'Autenticación con correo no habilitada.';
        break;
      case 'auth/too-many-requests':
        message = 'Demasiados intentos. Intenta más tarde.';
        break;
      case 'auth/too-many-requests':
        message = 'Demasiados intentos fallidos. Intenta más tarde.';
        break;
      case 'auth/network-request-failed':
        message = 'Error de conexión. Verifica tu internet.';
        break;
      case 'auth/invalid-credential':
        message = 'Credenciales inválidas. Verifica tu correo y contraseña.';
        break;
      default:
        message = error?.message || 'Error desconocido';
    }

    const customError = new Error(message);
    customError.name = code;
    return customError;
  },
};
