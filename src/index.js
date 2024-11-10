// require('dotenv').config({path:'./env'});

import mongoose from 'mongoose';
import express from 'express';
import { DB_NAME } from './constants.js';
import dotenv from 'dotenv';
import connectDB from './db/index.js';
import cookieParser from 'cookie-parser';
import cors from 'cors';

dotenv.config({path:'./.env'})

const app=express();
app.use(cors({
    origin:process.env.CORS_ORIGIN,
    credentials:true
}))
app.use(express.json({limit:'16kb'}))   // for form data handling
app.use(express.urlencoded({extended:true,limit:'16kb'}))   // for url data handling
app.use(express.static("public"))
app.use(cookieParser());


import userRouter from './routes/user.routes.js';

app.use("/api/v1/users",userRouter)







// wrapping whole db connection fun inside ifi function
// 1- approach for connectiong db

// ;(async()=>{
//     try {
//         await mongoose.connect(`${process.env.MONGODB_URL}/${DB_NAME}`)
//         app.on('error',(error)=>{
//             console.error('ERR: ',error);
//             throw error;
//         })

//         app.listen(process.env.PORT,()=>{
//             console.log(`App is running on port ${process.env.PORT}`);
//         })
//     } catch (error) {
//         console.error('ERROR: ',error);
//         throw error
//     }
// })()

connectDB()
.then(()=>{
    app.listen(process.env.PORT || 8000,()=>{
        console.log(`app is running on port: ${process.env.PORT}`)
    })
})
.catch((err)=>{
    console.log('MongoDB connection ERROR: ',err)
})