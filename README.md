# No-ORM

Free yourself from ORM's and code your own queries for MariaDB or PostgreSQL easyly and make your applications faster than ever

## Features

- You are again in control of the database and it's performance;
- Abstract between MariaDB or PostgreSQL databases. Noorm uses mysql2 and pg libs directly, without too many ORMs overheads;
- Easyly control transactions;
- Create and control your own migrations with scripts write by yourself;
- Deploy the migrations when and how you want or need.

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
DB_VERBOSE=     # If you want to see debug informations in console, set it to true
SCRIPTS_FOLDER= # the folder your migration scripts will be saved
MODELS_FOLDER=  # the folder used to save the interfaces with tables definitions
```
- Now, add to your project a script to create migrations:

Migrations are scripts with your database changes.
Create a file named *migration.ts* in the folder you want and paste this code:

```
import createMigration from 'noorm/migration';

setTimeout(async () => {
  await createMigration();
}, 500);
```
- Now, again, add to your project a script to deploy the migrations:

Deploy will run every new scripts in your database make the changes you wrote.
Create a file named *deploy.ts* in the folder you want and paste this code:

```
import deploy from 'noorm/deploy';

setTimeout(async () => {
  await deploy();
}, 500);
```
- Modify your package.json:

Add two scripts to create migrations and deploy them:
```
"scripts": {
   ... whatever you have ...
    "migration": "ts-node-dev <folder>/migration.ts",
    "deploy": "ts-node-dev <folder>/deploy.ts"
  },
```
You can change ts-node-dev for your convenience.
# Testing:

To create a new script file type:
```
yarn migration '<the name of the script without sql'
```
This will create a file with a pre defined header and open it with your VSCode. You can fill it with any SQL command you want, separating them with ; character.

To deploy the scripts to the database, type:
```
yarn deploy
```
Noorm will verify all new scripts and execute them in order using mariadb or psql command line tools.

# Usage
There is an example in *src/example*. This example shows you how to connect, disconnect, create/drop tables manually, make queries, inserts, updates, deletes and the usage of transactions.

