/*
    Folder structure 

   /data/v1/{domain}/{year}/pricing.json
   /data/v1/{domain}/{year}/pricing.csv
   /data/v1/{domain}/{year}/{month}/pricing.json
   /data/v1/{domain}/{year}/{month}/pricing.csv
   /data/v1/{domain}/{year}/{month}/{day}/pricing.json
   /data/v1/{domain}/{year}/{month}/{day}/pricing.csv
*/

import fs from 'fs/promises'
import path from 'path'
import {DateTimeFormatter} from '@js-joda/core'

function createUpsertList(data, directory, extension) {
    var upsert = {
    }
    data.forEach(entry => {
        var yearDir = directory + '/' + entry.start.year();
        var monthDir = yearDir + '/' + entry.start.monthValue();
        var dayDir = monthDir + '/' + entry.start.dayOfMonth();

        var yearFile = yearDir + '/pricing.' + extension;
        var monthFile = monthDir + '/pricing.' + extension;
        var dayFile = dayDir + '/pricing.' + extension;

        if (!upsert[dayFile]) upsert[dayFile] = [];
        if (!upsert[monthFile]) upsert[monthFile] = [];
        if (!upsert[yearFile]) upsert[yearFile] = [];

        upsert[dayFile].push(entry);
        upsert[monthFile].push(entry);
        upsert[yearFile].push(entry);
    })
    return Object.keys(upsert).map(key => {
        return {
            file: key,
            entries: upsert[key]
        }
    });
}

// export function jsonWriter(settings) {
//     return (data) => {
//         // load file, add entry, save again

//         var upsert = createUpsertList(data, settings.directory, 'csv')

//         // TODO: load file, add whats needed

//     }
// }

export function csvWriter(settings) {
    settings = {
        fs: fs,
        directory: process.cwd() + '/public/data',
        ...settings
    }
    return async (data) => {
        // append entry 
        var upsert = createUpsertList(data, settings.directory, 'csv')

        await createDirectories(settings.fs, upsert);

        let promises = upsert.map(({entries, file}) => {
            let data = entries.map(entry => {
                var startTime = entry.start.format(DateTimeFormatter.ISO_OFFSET_DATE_TIME);
                var endTime = entry.end.format(DateTimeFormatter.ISO_OFFSET_DATE_TIME);
                return `${startTime},${endTime},${entry.price}`
            }).join('\n') + "\n"

            return settings.fs.appendFile(file, data).then(() => file);
        })

        return Promise.allSettled(promises)
    }
}

export function sqlWriter(settings) {
    settings = {
        fs: fs,
        directory: process.cwd() + '/public/data',
        ...settings
    }
    return async (data) => {
        // append entry 
        var upsert = createUpsertList(data, settings.directory, 'sql')

        await createDirectories(settings.fs, upsert);

        let promises = upsert.map(({entries, file}) => {
            let data = entries.map(entry => {
                var startTime = entry.start.format(DateTimeFormatter.ISO_OFFSET_DATE_TIME);
                var endTime = entry.end.format(DateTimeFormatter.ISO_OFFSET_DATE_TIME);
                return (`INSERT INTO hourly_prices (domain, time_start, time_end, price) VALUES ('${entry.domain}', '${startTime}', '${endTime}', ${entry.price});`)
            }).join('\n') + "\n"

            return settings.fs.appendFile(file, data).then(() => file);
        })

        return Promise.allSettled(promises)
    }
}

async function createDirectories(fs, files) {
    return Promise.all(files.map(({file}) => {
        return fs.mkdir(path.dirname(file), {recursive: true});
    }))
}


export default function (settingsOverrides) {
    const settings = {
        writers: [
            csvWriter(),
            sqlWriter()
        ],
        ...settingsOverrides
    }

    return {
        write: async (data) => {
            return Promise.all(settings.writers.map(writer => writer(data)))
        }
    }

}