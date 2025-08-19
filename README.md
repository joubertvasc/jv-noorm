# No-ORM

Free yourself from ORMs and code your own queries for MariaDB or PostgreSQL easily and make your applications faster than ever.
Please consider this an experimental project without any warranty. You can use it AS IS.

## Features

- You are again in control of the database and its performance;
- Abstraction between MariaDB and PostgreSQL. Noorm uses mysql2 and pg directly, without the heavy overhead of ORMs;
- Easily control transactions;
- Create and manage your own migrations with scripts written by yourself;
- Deploy migrations whenever and however you need.

## Installation

Just type:

```
  npm install noorm
```

or

```
  yarn add noorm
```

## Configuring your project

- First, modify or create your .env file:

```
# Database configuration example
DB_TYPE=        # MariaDB or PostgreSQL
DB_HOST=        # IP or Address of the database
DB_PORT=        # Port number of the database
DB_DATABASE=    # Database name
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
import createMigration from 'noorm/migration';

setTimeout(async () => {
  await createMigration();
}, 500);
```

- Now, again, add to your project a script to deploy the migrations:

Deploy will run every new script in your database and apply the changes you wrote.
Create a file named _deploy.ts_ in the folder you want and paste this code:

```
import deploy from 'noorm/deploy';

setTimeout(async () => {
  await deploy();
}, 500);
```

- Add another file to your project with a script to generate interfaces to your project:

You can use these interfaces to type-check your query results.
Create a file named _generate.ts_ in the folder you want and paste this code:

```
import generate from 'noorm/generate';

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

Noorm will verify all new scripts and execute them in order using mariadb or psql command line tools.

To generate interfaces based on your database, type:

```
yarn generate
```

Noorm will generate multiple interface files, one for each table your database has.

# Usage

There is an example in _src/example_. This example demonstrates how to connect, disconnect, create/drop tables manually, run queries, and perform inserts, updates, deletes, and transactions.
