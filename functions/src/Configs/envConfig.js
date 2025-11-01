import dotenv from 'dotenv'
dotenv.config()

const envOptions = process.env.NODE_ENV=== 'test'? 'test' : 'firebaseOptions'

export default {
    Status: envOptions,
}