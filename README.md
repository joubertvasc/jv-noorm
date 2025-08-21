# JV No ORM

Free yourself from ORMs and code your own queries for MariaDB or PostgreSQL easily and make your applications faster than ever.
Please consider this an experimental project without any warranty. You can use it AS IS.

## Features

- You are again in control of the database and its performance;
- Abstraction between MariaDB and PostgreSQL. JV-Noorm uses mysql2 and pg directly, without the heavy overhead of ORMs;
- Easily control transactions;
- Create and manage your own migrations with scripts written by yourself;
- Deploy migrations whenever and however you need.

## Installation

Just type:

```
  npm install jv-noorm
```

or

```
  yarn add jv-noorm
```

## Configuring your project

- First, modify or create your .env file:

```
# Database configuration example
DB_TYPE=        # MariaDB or PostgreSQL
DB_HOST=        # IP or Address of the database
DB_PORT=        # Port number of the database
DB_DATABASE=    # Database name
DB_SCHEMA=      # For PostgreSQL only
DB_USER=        # Database username
DB_PASSWORD=    # Database password
DB_MAX_POOL=    # Max number of pool connections
DB_MIN_POOL=    # Min number of pool connections
DB_VERBOSE=     # If you want to see debug information in the console, set this to true
SCRIPTS_FOLDER= # the folder your migration scripts will be saved
MODELS_FOLDER=  # the folder used to save the interfaces with tables definitions
```

- Now, add to your project a script to create migrations:

Migrations are scripts with your database changes.
Create a file named _migration.ts_ in the folder you want and paste this code:

```
import { createMigration } from 'jv-noorm';

setTimeout(async () => {
  await createMigration();
}, 500);
```

- Now, again, add to your project a script to deploy the migrations:

Deploy will run every new script in your database and apply the changes you wrote.
Create a file named _deploy.ts_ in the folder you want and paste this code:

```
import { deploy } from 'jv-noorm';

setTimeout(async () => {
  await deploy();
}, 500);
```

- Add another file to your project with a script to generate interfaces to your project:

You can use these interfaces to type-check your query results.
Create a file named _generate.ts_ in the folder you want and paste this code:

```
import { generate } from 'jv-noorm';

setTimeout(async () => {
  await generate();
}, 500);
```

- Modify your package.json:

Add three scripts to create migrations and deploy them:

```
"scripts": {
   ... whatever you have ...
    "migration": "ts-node-dev <folder>/migration.ts",
    "deploy": "ts-node-dev <folder>/deploy.ts",
    "generate": "ts-node-dev <folder>/generate.ts"
  },
```

You can change ts-node-dev for your convenience.

# Testing:

To create a new script file type:

```
yarn migration '<the name of the script without sql'
```

This will create a file with a predefined header and open it in VSCode. You can fill it with any SQL command you want, separating them with ; character.

To deploy the scripts to the database, type:

```
yarn deploy
```

JV-noorm will verify all new scripts and execute them in order using mariadb or psql command line tools.

To generate interfaces based on your database, type:

```
yarn generate
```

JV-noorm will generate multiple interface files, one for each table your database has.

# Usage

import the connection:

```
import { createConnection } from 'jv-noorm';
```

Create the object:

```
const db = createConnection();
```

Now, db has the instance of the lib prepared to use MariaDB or PostgreSQL according with your .env definition.

Create the pool of connections:

```
await db.connect();
```

If your .env file is correct and the DB server is available and accessible, the database is connected.

The jv-noorm lib has some functions:

- await db.exec: for run commands without results, like creates, drops, etc.;
- await db.queryRow: for select commands with just one row as result;
- await db.queryRows: for select commands with more than one row as result;
- await db.insert: for insert command. The result will return the number of the rows inserted and the id of auto_create or serial primary keys (if only one row returned);
- await db.update: for update command. The result will return the number of updated rows;
- await db.delete: for delete command. The result will return the number of deleted rows. This command can execute a hard or soft delete;
- await db.startTransaction or await db.beginTransaction: used to start a new transaction;
- await db.commit: used to commit changes;
- await db.rollback: used to rollback changes;
- await db.close: used to finish the pool connections.

There are examples in _src/example_, one for MariaDB and other for PostgreSQL. These examples demonstrates how to connect, disconnect, create/drop tables manually, run queries, and perform inserts, updates, deletes, and transactions.
