import { Sequelize } from 'sequelize'
import dotenv from 'dotenv'

dotenv.config()

const dialect = (process.env.DB_DIALECT || 'sqlite') as 'sqlite' | 'postgres'

const sequelize =
  dialect === 'sqlite'
    ? new Sequelize({
        dialect: 'sqlite',
        storage: process.env.DB_STORAGE || './dev.sqlite',
        logging: false,
      })
    : new Sequelize({
        host: process.env.DB_HOST,
        port: Number(process.env.DB_PORT),
        database: process.env.DB_NAME,
        username: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        dialect: 'postgres',
        logging: false,
        pool: {
          max: 5,
          min: 0,
          acquire: 30000,
          idle: 10000,
        },
      })

export default sequelize
