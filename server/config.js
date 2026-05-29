// config.js - validates required environment variables
const Joi = require('joi');
require('dotenv').config();

const envSchema = Joi.object({
  MONGO_URI: Joi.string().required(),
  JWT_SECRET: Joi.string().min(8).required(),
  JWT_REFRESH_SECRET: Joi.string().min(8).required(),
  PORT: Joi.number().default(5000),
}).unknown(); // allow other env vars

const { error, value: envVars } = envSchema.validate(process.env);
if (error) {
  console.error('❌ Invalid environment configuration:', error.message);
  process.exit(1);
}

module.exports = envVars;
