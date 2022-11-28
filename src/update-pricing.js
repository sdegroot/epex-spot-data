#!/usr/bin/env node
import dotenv from "dotenv";
import { entsoeGetRequest, entsoeGetTimeSeries, mapEntsoeTimeSeries } from "./entsoe.js"
import filesystem, { csvWriter, sqlWriter } from "./filesystem.js"
dotenv.config();

/*
   Relevant data for machine learning 
    - weather 
    - pricing
    - sentiment? about #energy 


   Flow: each day, we download for the next day, update the monthly data and the yearly data

   TODO: what if we miss a single day? Or if the data was not present yet?
*/

const { ENTSOE_TOKEN, FROM_DATE, UNTIL_DATE, ENTSOE_DOMAIN, TIMEZONE } = process.env;

const now = () => new Date();

const startOfTomorrow = () => {
    const date = now();
    date.setHours(0);
    date.setMinutes(0);
    date.setDate(date.getDate() + 1)
    return date;
}

const tomorrowEndOfDay = () => {
    const date = now();
    date.setHours(0);
    date.setMinutes(0);
    date.setDate(date.getDate() + 2) // two days later, but until midnight that night
    return date;
}


let startDate = FROM_DATE ? new Date(FROM_DATE) : startOfTomorrow()
let endDate = UNTIL_DATE ? new Date(UNTIL_DATE) : tomorrowEndOfDay()

// const DOMAINS = [
//     { country: 'NL', code: '10YNL----------L', filename: 'nl', timezone: 'Europe/Amsterdam'}
// ];

const authenticatedEntsoeGetRequest = entsoeGetRequest(ENTSOE_TOKEN);
const entsoeGetDomainTimeSeries = entsoeGetTimeSeries(authenticatedEntsoeGetRequest, ENTSOE_DOMAIN);

const data = await entsoeGetDomainTimeSeries(startDate, endDate)

const series = mapEntsoeTimeSeries(data, TIMEZONE)


filesystem({
    writers: [
        csvWriter({
            directory: process.cwd() + "/public/data/" + ENTSOE_DOMAIN
        }),
        sqlWriter({
            directory: process.cwd() + "/public/data/" + ENTSOE_DOMAIN
        })
    ],
    // fs: {
    //     appendFile: async (file, data) => {
    //         console.log(file, data);
    //         return Promise.resolve();
    //     },
    //     mkdir: async (dir, settings) => {
    //         console.log(dir, settings);
    //         return Promise.resolve();
    //     }
    // }
}).write(series).then(result => console.log(result))
