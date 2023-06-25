"use strict";

/**
 * order controller
 */

const { createCoreController } = require("@strapi/strapi").factories;
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

module.exports = createCoreController("api::order.order", ({ strapi }) => ({
  async customOrderController(ctx) {
    try {
      const bodydata = ctx.body;
      const entries = await strapi.entityService.findMany(
        "api::product.product",
        {
          fields: ["title"],
        }
      );
      return { data: entries };
    } catch (err) {
      ctx.body = err;
    }
  },
  async create(ctx) {
    try {
      const { products } = ctx.request.body;

      const linesItems = products.map((product) => {
        return {
          price_data: {
            currency: "inr",
            product_data: {
              name: product.title,
              images:[product.image]
            },
            unit_amount: product.price * 100,
          },
          quantity: product.quantity,
        };
      });

      const session = await stripe.checkout.sessions.create({
        shipping_address_collection: {
          allowed_countries: ["IN"],
        },
        line_items: linesItems,
        mode: "payment",
        success_url: `${process.env.CLIENT_BASE_URL}?success=true`,
        cancel_url: `${process.env.CLIENT_BASE_URL}?canceled=true`,
      });

      await strapi.entityService.create("api::order.order", {
        data: {
          products,
          stripeId: session.id,
        },
      });

      return { strapeId: session.id };
    } catch (error) {
      console.log(error);
      ctx.response.status = 500;
      return error;
    }
  },
}));
 