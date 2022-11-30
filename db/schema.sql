DROP TABLE IF EXISTS js_messages CASCADE;
DROP TABLE IF EXISTS js_transactions CASCADE;
DROP TABLE IF EXISTS js_agent_balances CASCADE;
DROP TABLE IF EXISTS js_agents CASCADE;
DROP TABLE IF EXISTS js_task_deposits CASCADE;
DROP TABLE IF EXISTS js_task_amount_per CASCADE;
DROP TABLE IF EXISTS js_task_rules CASCADE;
DROP TABLE IF EXISTS js_task_actions CASCADE;
DROP TABLE IF EXISTS js_tasks CASCADE;
DROP TABLE IF EXISTS js_config_balances CASCADE;
DROP TABLE IF EXISTS js_config CASCADE;
DROP TABLE IF EXISTS js_contract_block_piv CASCADE;
DROP TABLE IF EXISTS js_contracts CASCADE;
DROP TABLE IF EXISTS js_blocks CASCADE;
DROP TABLE IF EXISTS js_chain_network;

--- Chain and network info

CREATE TABLE js_chain_network
(
    id              bigint                NOT NULL,
    name            character varying(32),
    chain_id_prefix character varying(32) NOT NULL,
    network         character varying(32)
);
CREATE SEQUENCE chain_network_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE CACHE 1;
ALTER SEQUENCE chain_network_id_seq OWNED BY js_chain_network.id;
ALTER TABLE ONLY js_chain_network ALTER COLUMN id SET DEFAULT nextval('chain_network_id_seq'::regclass);
ALTER TABLE ONLY js_chain_network ADD CONSTRAINT chain_network_id_key UNIQUE (id);

--- Block heights per network

CREATE TABLE js_blocks
(
    id                  bigint    NOT NULL,
    fk_chain_network_id bigint    NOT NULL,
    height              bigint    NOT NULL,
    time                timestamp NOT NULL
);
COMMENT
ON COLUMN js_chain_network.id IS 'Simple incrementing number used as foreign key in js_transactions table';
CREATE SEQUENCE blocks_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE CACHE 1;
ALTER SEQUENCE blocks_id_seq OWNED BY js_blocks.id;
ALTER TABLE ONLY js_blocks ALTER COLUMN id SET DEFAULT nextval('blocks_id_seq'::regclass);
ALTER TABLE ONLY js_blocks ADD CONSTRAINT blocks_id_key UNIQUE (id);
ALTER TABLE ONLY js_blocks ADD CONSTRAINT fk_chain_network FOREIGN KEY (fk_chain_network_id) REFERENCES js_chain_network(id);
ALTER TABLE ONLY js_blocks ADD CONSTRAINT blocks_pkey PRIMARY KEY (height, fk_chain_network_id);

--- Transaction info (is filled in progressively)

CREATE TABLE js_transactions
(
    id          bigint                NOT NULL,
    fk_block_id bigint                NOT NULL,
    hash        character varying(64) NOT NULL,
    is_complete boolean DEFAULT false NOT NULL,
    code        int,
    gas_wanted  bigint,
    gas_used    bigint,
    log         text,
    msg_detail  text
);
CREATE SEQUENCE tx_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE CACHE 1;
ALTER SEQUENCE tx_id_seq OWNED BY js_transactions.id;
ALTER TABLE ONLY js_transactions ALTER COLUMN id SET DEFAULT nextval('tx_id_seq'::regclass);
ALTER TABLE ONLY js_transactions ADD CONSTRAINT transactions_id_key UNIQUE (id);
ALTER TABLE ONLY js_transactions ADD CONSTRAINT fk_block FOREIGN KEY (fk_block_id) REFERENCES js_blocks(id);

--- Contracts

CREATE TABLE js_contracts
(
    id                  bigint                 NOT NULL,
    fk_chain_network_id bigint                 NOT NULL,
    address             character varying(128) NOT NULL
);
CREATE SEQUENCE contracts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE CACHE 1;
ALTER SEQUENCE contracts_id_seq OWNED BY js_contracts.id;
ALTER TABLE ONLY js_contracts ALTER COLUMN id SET DEFAULT nextval('contracts_id_seq'::regclass);
ALTER TABLE ONLY js_contracts ADD CONSTRAINT fk_chain_network FOREIGN KEY (fk_chain_network_id) REFERENCES js_chain_network(id);
ALTER TABLE ONLY js_contracts ADD CONSTRAINT contracts_id_key UNIQUE (id);

--- Wasm execute message details, args are JSON of the params

CREATE TABLE js_messages
(
    id             bigint                 NOT NULL,
    fk_tx_id       bigint                 NOT NULL,
    contract       character varying(128) NOT NULL,
    fk_contract_id bigint,
    fn             character varying(128) NOT NULL,
    sender         character varying(128) NOT NULL,
    args           text
);
CREATE SEQUENCE messages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE CACHE 1;
ALTER SEQUENCE messages_id_seq OWNED BY js_messages.id;
ALTER TABLE ONLY js_messages ALTER COLUMN id SET DEFAULT nextval('messages_id_seq'::regclass);
ALTER TABLE ONLY js_messages ADD CONSTRAINT fk_tx FOREIGN KEY (fk_tx_id) REFERENCES js_transactions(id);
ALTER TABLE ONLY js_messages ADD CONSTRAINT fk_contract FOREIGN KEY (fk_contract_id) REFERENCES js_contracts(id);
ALTER TABLE ONLY js_messages ADD CONSTRAINT messages_id_key UNIQUE (id);

--- Contract + Block pivot table (plus code ID)

CREATE TABLE js_contract_block_piv
(
    id             bigint NOT NULL,
    fk_contract_id bigint NOT NULL,
    fk_block_id    bigint NOT NULL,
    code_id        bigint,
    state_synced   boolean
);
CREATE SEQUENCE contract_block_piv_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE CACHE 1;
ALTER SEQUENCE contract_block_piv_id_seq OWNED BY js_contract_block_piv.id;
ALTER TABLE ONLY js_contract_block_piv ALTER COLUMN id SET DEFAULT nextval('contract_block_piv_id_seq'::regclass);
ALTER TABLE ONLY js_contract_block_piv ADD CONSTRAINT fk_contract FOREIGN KEY (fk_contract_id) REFERENCES js_contracts(id);
ALTER TABLE ONLY js_contract_block_piv ADD CONSTRAINT fk_block FOREIGN KEY (fk_block_id) REFERENCES js_blocks(id);
ALTER TABLE ONLY js_contract_block_piv ADD CONSTRAINT contract_block_piv_id_key UNIQUE (id);

--- Agents per contract

CREATE TABLE js_agents
(
    id                   bigint                 NOT NULL,
    fk_cb_id             bigint                 NOT NULL,
    address              character varying(128) NOT NULL,
    is_active            boolean                NOT NULL,
    payable_account_id   character varying(128),
    total_tasks_executed bigint,
    last_executed_slot   bigint,
    register_start       timestamp
);
CREATE SEQUENCE agents_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE CACHE 1;
ALTER SEQUENCE agents_id_seq OWNED BY js_agents.id;
ALTER TABLE ONLY js_agents ALTER COLUMN id SET DEFAULT nextval('agents_id_seq'::regclass);
ALTER TABLE ONLY js_agents ADD CONSTRAINT fk_cb FOREIGN KEY (fk_cb_id) REFERENCES js_contract_block_piv(id);
ALTER TABLE ONLY js_agents ADD CONSTRAINT agents_id_key UNIQUE (id);

--- Agent's balances

CREATE TABLE js_agent_balances
(
    id          bigint                NOT NULL,
    fk_agent_id bigint                NOT NULL,
    type        character varying(32) NOT NULL,
    address     character varying(128),
    denom       character varying(32),
    amount      bigint                NOT NULL
);
CREATE SEQUENCE agent_balances_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE CACHE 1;
ALTER SEQUENCE agent_balances_id_seq OWNED BY js_agent_balances.id;
ALTER TABLE ONLY js_agent_balances ALTER COLUMN id SET DEFAULT nextval('agent_balances_id_seq'::regclass);
ALTER TABLE ONLY js_agent_balances ADD CONSTRAINT fk_agent FOREIGN KEY (fk_agent_id) REFERENCES js_agents(id);
ALTER TABLE ONLY js_agent_balances ADD CONSTRAINT agent_balances_id_key UNIQUE (id);

--- Tasks per contract

CREATE TABLE js_tasks
(
    id                    bigint                 NOT NULL,
    fk_cb_id              bigint                 NOT NULL,
    hash                  character varying(128) NOT NULL,
    owner                 character varying(128) NOT NULL,
    interval_type         character varying(32)  NOT NULL,
    interval_value        character varying(32),
    stop_on_fail          boolean,
    boundary_height_start bigint,
    boundary_height_end   bigint,
    boundary_time_start   timestamp,
    boundary_time_end     timestamp
);
CREATE SEQUENCE tasks_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE CACHE 1;
ALTER SEQUENCE tasks_id_seq OWNED BY js_tasks.id;
ALTER TABLE ONLY js_tasks ALTER COLUMN id SET DEFAULT nextval('tasks_id_seq'::regclass);
ALTER TABLE ONLY js_tasks ADD CONSTRAINT fk_cb FOREIGN KEY (fk_cb_id) REFERENCES js_contract_block_piv(id);
ALTER TABLE ONLY js_tasks ADD CONSTRAINT tasks_id_key UNIQUE (id);

--- Task's deposits

CREATE TABLE js_task_deposits
(
    id         bigint                NOT NULL,
    fk_task_id bigint                NOT NULL,
    type       character varying(32) NOT NULL,
    denom      character varying(32),
    address    character varying(128),
    amount     bigint                NOT NULL
);
CREATE SEQUENCE task_deposits_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE CACHE 1;
ALTER SEQUENCE task_deposits_id_seq OWNED BY js_task_deposits.id;
ALTER TABLE ONLY js_task_deposits ALTER COLUMN id SET DEFAULT nextval('task_deposits_id_seq'::regclass);
ALTER TABLE ONLY js_task_deposits ADD CONSTRAINT fk_task FOREIGN KEY (fk_task_id) REFERENCES js_tasks(id);
ALTER TABLE ONLY js_task_deposits ADD CONSTRAINT task_deposits_id_key UNIQUE (id);

--- Task's amount per task (as native or cw20 types)

CREATE TABLE js_task_amount_per
(
    id         bigint                NOT NULL,
    fk_task_id bigint                NOT NULL,
    type       character varying(32) NOT NULL,
    denom      character varying(32),
    address    character varying(128),
    amount     bigint                NOT NULL
);
CREATE SEQUENCE task_amount_per_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE CACHE 1;
ALTER SEQUENCE task_amount_per_id_seq OWNED BY js_task_amount_per.id;
ALTER TABLE ONLY js_task_amount_per ALTER COLUMN id SET DEFAULT nextval('task_amount_per_id_seq'::regclass);
ALTER TABLE ONLY js_task_amount_per ADD CONSTRAINT fk_task FOREIGN KEY (fk_task_id) REFERENCES js_tasks(id);
ALTER TABLE ONLY js_task_amount_per ADD CONSTRAINT task_amount_per_id_key UNIQUE (id);

--- Task's rules

CREATE TABLE js_task_rules
(
    id           bigint                NOT NULL,
    fk_task_id   bigint                NOT NULL,
    rule_variant character varying(32) NOT NULL,
    data         text
);
CREATE SEQUENCE task_rules_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE CACHE 1;
ALTER SEQUENCE task_rules_id_seq OWNED BY js_task_rules.id;
ALTER TABLE ONLY js_task_rules ALTER COLUMN id SET DEFAULT nextval('task_rules_id_seq'::regclass);
ALTER TABLE ONLY js_task_rules ADD CONSTRAINT fk_task FOREIGN KEY (fk_task_id) REFERENCES js_tasks(id);
ALTER TABLE ONLY js_task_rules ADD CONSTRAINT task_rules_id_key UNIQUE (id);

--- Task's actions

CREATE TABLE js_task_actions
(
    id         bigint NOT NULL,
    fk_task_id bigint NOT NULL,
    msg        text   NOT NULL,
    gas_limit  bigint
);
CREATE SEQUENCE task_actions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE CACHE 1;
ALTER SEQUENCE task_actions_id_seq OWNED BY js_task_actions.id;
ALTER TABLE ONLY js_task_actions ALTER COLUMN id SET DEFAULT nextval('task_actions_id_seq'::regclass);
ALTER TABLE ONLY js_task_actions ADD CONSTRAINT fk_task FOREIGN KEY (fk_task_id) REFERENCES js_tasks(id);
ALTER TABLE ONLY js_task_actions ADD CONSTRAINT task_actions_id_key UNIQUE (id);

--- Config per contract

CREATE TABLE js_config
(
    id                       bigint NOT NULL,
    fk_cb_id                 bigint NOT NULL,
    paused                   boolean,
    owner_id                 character varying(128),
    min_tasks_per_agent      int,
    agent_fee                int,
    gas_fraction_numerator   int,
    gas_fraction_denominator int,
    gas_base_fee             bigint,
    gas_action_fee           bigint,
    proxy_callback_gas       bigint,
    native_denom             character varying(32)
);
CREATE SEQUENCE config_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE CACHE 1;
ALTER SEQUENCE config_id_seq OWNED BY js_config.id;
ALTER TABLE ONLY js_config ALTER COLUMN id SET DEFAULT nextval('config_id_seq'::regclass);
ALTER TABLE ONLY js_config ADD CONSTRAINT fk_block FOREIGN KEY (fk_cb_id) REFERENCES js_contract_block_piv(id);
ALTER TABLE ONLY js_config ADD CONSTRAINT config_id_key UNIQUE (id);

--- Config's balances (also called available_balance)

CREATE TABLE js_config_balances
(
    id           bigint                NOT NULL,
    fk_config_id bigint                NOT NULL,
    type         character varying(32) NOT NULL,
    staked       boolean               NOT NULL DEFAULT false,
    address      character varying(128),
    denom        character varying(32),
    amount       bigint                NOT NULL
);
CREATE SEQUENCE config_balances_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE CACHE 1;
ALTER SEQUENCE config_balances_id_seq OWNED BY js_config_balances.id;
ALTER TABLE ONLY js_config_balances ALTER COLUMN id SET DEFAULT nextval('config_balances_id_seq'::regclass);
ALTER TABLE ONLY js_config_balances ADD CONSTRAINT fk_config FOREIGN KEY (fk_config_id) REFERENCES js_config(id);
ALTER TABLE ONLY js_config_balances ADD CONSTRAINT config_balances_id_key UNIQUE (id);
