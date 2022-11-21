"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.insertChainInfo = exports.getDb = void 0;
const dotenv_1 = require("dotenv");
const knex_1 = __importDefault(require("knex"));
const variables_1 = require("./variables");
// Set up dotenv for environment variables
(0, dotenv_1.config)({ path: '.env' });
const DB_HOSTIP = process.env.DB_HOSTIP;
const DB_HOSTPORT = Number.parseInt(process.env.DB_HOSTPORT);
const DB_NAME = process.env.DB_NAME;
const DB_USER = process.env.DB_USER;
const DB_PASS = process.env.DB_PASS;
const getDb = () => {
    const enableSSL = !['localhost', '127.0.0.1'].includes(DB_HOSTIP);
    return (0, knex_1.default)({
        client: 'pg',
        connection: {
            user: DB_USER,
            password: DB_PASS,
            database: DB_NAME,
            host: DB_HOSTIP,
            port: DB_HOSTPORT,
            ssl: enableSSL
        },
        pool: {
            max: 5,
            min: 5,
            acquireTimeoutMillis: 60000,
            createTimeoutMillis: 30000,
            idleTimeoutMillis: 600000,
            createRetryIntervalMillis: 200,
        }
    });
};
exports.getDb = getDb;
const insertChainInfo = async ({ chainIdPrefix }) => {
    let insertChainInfoRes = await (0, variables_1.db)('js_chain_network')
        .select('id')
        .where('chain_id_prefix', chainIdPrefix);
    if (insertChainInfoRes.length === 0) {
        insertChainInfoRes = await (0, variables_1.db)('js_chain_network').insert({ 'chain_id_prefix': chainIdPrefix }, 'id');
    }
    return insertChainInfoRes[0].id;
};
exports.insertChainInfo = insertChainInfo;
