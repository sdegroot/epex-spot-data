import fetch from "node-fetch"
import qs from "qs"
import xml2js from "xml2js"
import {ZonedDateTime, ZoneId} from '@js-joda/core'
import * as timezone from '@js-joda/timezone'


export const entsoeGetRequest = (token) => {
    return async (params) => {
        const baseUrl = 'https://transparency.entsoe.eu/api?';

        const _params = {
            securityToken: token,
            ...params
        }

        const url = `https://transparency.entsoe.eu/api?${qs.stringify(_params)}`;

        console.log(`Requesting ENTSOE: ${url.replace(token, '****')}`)

        const res = await fetch(url, {
            headers: {
                'Accept': 'application/xml'
            }
        });
        let xml = await res.text();
        return xml2js.parseStringPromise(xml)
    }
}

export const entsoeGetTimeSeries = (requestor, domain) => {

    return async (startDate, endDate) => {
        const DATE_FORMAT = "YYYYMMDDHHmm"

        const params = {
            documentType: 'A44',
            in_Domain: domain,
            out_Domain: domain,
            timeInterval: startDate.toISOString() + '/' + endDate.toISOString()//'2016-01-01T00:00Z/2016-01-02T00:00Z',
        }

        const response = await requestor(params)
        if (response.Publication_MarketDocument && response.Publication_MarketDocument.type == 'A44') {
            console.log(JSON.stringify(response.Publication_MarketDocument.TimeSeries));
            return response.Publication_MarketDocument.TimeSeries;
        } else {
            throw { response: response, message: 'Unexpected response' }
        }

    }
}

export const mapEntsoeTimeSeries = (timeSeries, timeZone) => {
    return timeSeries.map(timeSerie => {
        if (timeSerie['currency_Unit.name'] != 'EUR') {
            throw 'Expected EUR as currency, cannot deal with other currencies'
        }
        if (timeSerie['price_Measure_Unit.name'] != 'MWH') {
            throw 'Expected MWH as unit, cannot deal with other units'
        }

        const period = timeSerie.Period[0];
        if (period.resolution != 'PT60M') {
            throw 'expected PT60M as interval, cannot deal with other intervals at the moment';
        }

        const startDate = ZonedDateTime.parse(period.timeInterval[0].start[0]).withZoneSameInstant(ZoneId.of(timeZone));

        return period.Point.map(point => {
            return {
                start: startDate.plusHours(parseInt(point.position[0]) - 1),
                end: startDate.plusHours(parseInt(point.position[0])),
                price: point['price.amount'][0],
                domain: timeSerie['out_Domain.mRID'][0]['_']
            }
        });
    }).flat()
}