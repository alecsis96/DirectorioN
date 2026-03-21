import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const productSchema = new Schema(
  {
    business_id: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    nombre: {
      type: String,
      required: true,
      trim: true,
    },
    precio: {
      type: Number,
      required: true,
      min: 0,
    },
    categoria_platillo: {
      type: String,
      required: true,
      trim: true,
      default: "General",
    },
  },
  {
    timestamps: true,
    versionKey: false,
    collection: "products",
  }
);

productSchema.index({ business_id: 1, categoria_platillo: 1, nombre: 1 });

export type ProductDocument = InferSchemaType<typeof productSchema> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

const Product =
  (mongoose.models.Product as Model<ProductDocument> | undefined) ||
  mongoose.model<ProductDocument>("Product", productSchema);

export default Product;
