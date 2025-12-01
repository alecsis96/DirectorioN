import Link from 'next/link';
import { HelpCircle, Mail, MessageCircle, Phone, FileText, AlertCircle, Clock, MapPin } from 'lucide-react';

export const metadata = {
  title: 'Ayuda y Soporte | Directorio Yajalón',
  description: 'Centro de ayuda y soporte para usuarios y negocios del Directorio de Yajalón',
};

export default function AyudaPage() {
  const faqs = [
    {
      question: '¿Cómo registro mi negocio?',
      answer: 'Puedes registrar tu negocio haciendo clic en "Para Negocios" en el menú principal, luego en "Registrar Negocio". Completa el formulario con la información de tu empresa y espera la aprobación del administrador.',
    },
    {
      question: '¿Cuánto tiempo tarda la aprobación?',
      answer: 'Normalmente procesamos las solicitudes en 24-48 horas hábiles. Recibirás una notificación por email cuando tu negocio sea aprobado.',
    },
    {
      question: '¿Cómo actualizo la información de mi negocio?',
      answer: 'Inicia sesión con tu cuenta, ve a "Mis Negocios" y haz clic en "Editar" en el negocio que deseas actualizar.',
    },
    {
      question: '¿Qué incluye el plan Featured?',
      answer: 'El plan Featured incluye: aparición prioritaria en búsquedas, destacado con insignia dorada, analytics detallados y soporte prioritario por WhatsApp.',
    },
    {
      question: '¿Qué incluye el plan Sponsor?',
      answer: 'El plan Sponsor incluye todo lo de Featured más: aparición en la sección premium del inicio, logo grande, posición destacada y máxima visibilidad.',
    },
    {
      question: '¿Cómo agrego horarios de atención?',
      answer: 'En el editor de tu negocio, encontrarás la sección "Horarios". Puedes agregar horarios específicos para cada día de la semana.',
    },
    {
      question: '¿Puedo subir fotos de mi negocio?',
      answer: 'Sí, puedes subir un logo y una foto de portada. En el futuro podrás agregar una galería de fotos.',
    },
    {
      question: '¿Cómo funcionan las reseñas?',
      answer: 'Los usuarios registrados pueden dejar reseñas y calificaciones en tu negocio. Las reseñas son públicas y ayudan a otros usuarios a conocer tu servicio.',
    },
  ];

  const contactMethods = [
    {
      icon: MessageCircle,
      title: 'WhatsApp',
      description: 'Chatea con nosotros',
      action: 'Enviar mensaje',
      href: 'https://wa.me/529191234567?text=Hola,%20necesito%20ayuda%20con%20el%20Directorio%20de%20Negocios',
      color: 'bg-green-50 text-green-700 border-green-200',
    },
    {
      icon: Mail,
      title: 'Email',
      description: 'contacto@directorioyajalon.com',
      action: 'Enviar email',
      href: 'mailto:contacto@directorioyajalon.com',
      color: 'bg-blue-50 text-blue-700 border-blue-200',
    },
    {
      icon: Phone,
      title: 'Teléfono',
      description: '(919) 123-4567',
      action: 'Llamar ahora',
      href: 'tel:+529191234567',
      color: 'bg-purple-50 text-purple-700 border-purple-200',
    },
  ];

  const quickLinks = [
    {
      icon: FileText,
      title: 'Registrar mi negocio',
      description: 'Crea tu perfil de negocio',
      href: '/registro-negocio',
    },
    {
      icon: HelpCircle,
      title: 'Para Negocios',
      description: 'Información y planes',
      href: '/para-negocios',
    },
    {
      icon: MapPin,
      title: 'Explorar negocios',
      description: 'Ver todos los negocios',
      href: '/negocios',
    },
  ];

  return (
    <main className="min-h-screen bg-gray-50 py-12 px-4 pb-24">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-[#38761D] rounded-full mb-4">
            <HelpCircle className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Centro de Ayuda y Soporte
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Encuentra respuestas a tus preguntas o contáctanos directamente. Estamos aquí para ayudarte.
          </p>
        </div>

        {/* Contact Methods */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {contactMethods.map((method, index) => (
            <a
              key={index}
              href={method.href}
              target="_blank"
              rel="noopener noreferrer"
              className={`${method.color} border-2 rounded-xl p-6 hover:shadow-lg transition-all group`}
            >
              <method.icon className="w-10 h-10 mb-3 group-hover:scale-110 transition-transform" />
              <h3 className="text-lg font-bold mb-1">{method.title}</h3>
              <p className="text-sm mb-3 opacity-80">{method.description}</p>
              <span className="text-sm font-semibold underline">
                {method.action} →
              </span>
            </a>
          ))}
        </div>

        {/* Quick Links */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <AlertCircle className="w-6 h-6 text-[#38761D]" />
            Enlaces rápidos
          </h2>
          <div className="grid md:grid-cols-3 gap-4">
            {quickLinks.map((link, index) => (
              <Link
                key={index}
                href={link.href}
                className="flex items-start gap-3 p-4 rounded-lg border border-gray-200 hover:border-[#38761D] hover:bg-green-50 transition-all group"
              >
                <link.icon className="w-6 h-6 text-gray-400 group-hover:text-[#38761D] flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-gray-900 group-hover:text-[#38761D]">
                    {link.title}
                  </h3>
                  <p className="text-sm text-gray-600">{link.description}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* FAQs */}
        <div className="bg-white rounded-xl shadow-sm p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <FileText className="w-6 h-6 text-[#38761D]" />
            Preguntas Frecuentes
          </h2>
          <div className="space-y-6">
            {faqs.map((faq, index) => (
              <div key={index} className="border-b border-gray-200 last:border-0 pb-6 last:pb-0">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {faq.question}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {faq.answer}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Horario de Atención */}
        <div className="mt-8 bg-gradient-to-r from-[#38761D] to-[#2d5418] rounded-xl shadow-sm p-6 text-white">
          <div className="flex items-center gap-3 mb-3">
            <Clock className="w-6 h-6" />
            <h2 className="text-xl font-bold">Horario de Atención</h2>
          </div>
          <p className="text-white/90">
            Lunes a Viernes: 9:00 AM - 6:00 PM<br />
            Sábados: 10:00 AM - 2:00 PM<br />
            Domingos: Cerrado
          </p>
          <p className="mt-3 text-sm text-white/80">
            * Respondemos mensajes fuera de horario en un plazo de 24 horas
          </p>
        </div>

        {/* CTA Final */}
        <div className="mt-12 text-center bg-white rounded-xl shadow-sm p-8">
          <p className="text-gray-600 mb-4 text-lg">
            ¿No encontraste lo que buscabas?
          </p>
          <a
            href="https://wa.me/529191234567?text=Hola,%20necesito%20ayuda%20con%20el%20Directorio%20de%20Negocios"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#38761D] text-white font-semibold rounded-lg hover:bg-[#2d5418] transition shadow-lg hover:shadow-xl"
          >
            <MessageCircle className="w-5 h-5" />
            Contáctanos por WhatsApp
          </a>
        </div>
      </div>
    </main>
  );
}
