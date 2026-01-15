"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pickBusinessPreview = void 0;
const pickBusinessPreview = (biz) => {
    var _a, _b, _c, _d, _e;
    const phone = typeof biz.phone === "string" && biz.phone.trim().length ? biz.phone.trim() : undefined;
    const whatsapp = typeof biz.WhatsApp === "string" && biz.WhatsApp.trim().length ? biz.WhatsApp.trim() : undefined;
    const sanitizedHorarios = biz.horarios ? Object.assign({}, biz.horarios) : undefined;
    return Object.assign(Object.assign(Object.assign({ id: (_a = biz.id) !== null && _a !== void 0 ? _a : "", name: biz.name, category: (_b = biz.category) !== null && _b !== void 0 ? _b : "", colonia: (_d = (_c = biz.colonia) !== null && _c !== void 0 ? _c : biz.neighborhood) !== null && _d !== void 0 ? _d : "", ownerId: biz.ownerId, ownerEmail: biz.ownerEmail, rating: typeof biz.rating === "number" ? biz.rating : null, isOpen: biz.isOpen === "no" ? "no" : "si", address: (_e = biz.address) !== null && _e !== void 0 ? _e : "", description: biz.description, hours: biz.hours, hasDelivery: biz.hasDelivery === true, featured: biz.featured === true || biz.featured === 'true', plan: biz.plan, priceRange: biz.priceRange, image1: biz.image1, image2: biz.image2, image3: biz.image3, logoUrl: biz.logoUrl, coverUrl: biz.coverUrl, images: biz.images, location: biz.location }, (phone ? { phone } : {})), (whatsapp ? { WhatsApp: whatsapp } : {})), (sanitizedHorarios ? { horarios: sanitizedHorarios } : {}));
};
exports.pickBusinessPreview = pickBusinessPreview;
//# sourceMappingURL=business.js.map