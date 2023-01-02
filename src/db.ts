import { config } from "dotenv"
import knex from "knex";
import {db} from "./variables";

// Set up dotenv for environment variables
config({ path: '.env' });

const DB_HOSTIP = process.env.DB_HOSTIP
const DB_HOSTPORT: number = Number.parseInt(process.env.DB_HOSTPORT)
const DB_NAME = process.env.DB_NAME
const DB_USER = process.env.DB_USER
const DB_PASS = process.env.DB_PASS

export const getDb = () => {
    const enableSSL = !['localhost', '127.0.0.1'].includes(DB_HOSTIP);

    return knex({
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
            max: 19,
            min: 5,
            acquireTimeoutMillis: 60000,
            createTimeoutMillis: 30000,
            idleTimeoutMillis: 600000,
            createRetryIntervalMillis: 200,
        }
    });
}

export const insertChainInfo = async ({chainIdPrefix}) => {
    let insertChainInfoRes = await db('js_chain_network')
        .select('id')
        .where('chain_id_prefix', chainIdPrefix)
    if (insertChainInfoRes.length === 0) {
        insertChainInfoRes = await db('js_chain_network').insert({'chain_id_prefix': chainIdPrefix}, 'id')
    }
    return insertChainInfoRes[0].id
}
