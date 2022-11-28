#!/usr/bin/env node

import ejs from 'ejs'
import {resolve} from 'path'
import {readdir,writeFile} from 'fs/promises'

/*
 * structure
 * [domain] -> [
 *    [year] -> [
 *      [month] -> []
 *      [file] -> ""
 *    ]
 *    
 * ]
 */
async function getFiles(dir) {
    const dirents = await readdir(dir, { withFileTypes: true });
    const files = await Promise.all(dirents.map((dirent) => {
        const res = resolve(dir, dirent.name);
        return dirent.isDirectory() ? getFiles(res) : res;
    }));
    return Array.prototype.concat(...files);
}

(async function render() {

    let data = {
        files: await getFiles(process.cwd() + '/public/data')
    }
    
    let html = await ejs.renderFile('src/index.ejs', data);

    writeFile('public/index.html', html)
})();
