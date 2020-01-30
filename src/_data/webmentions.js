// https://sia.codes/posts/webmentions-eleventy-in-depth/

const fs = require('fs');
const fetch = require('node-fetch');
const unionBy = require('lodash/unionBy');
const domain = require('./site.js').domain;

// Load .env variables with dotenv
require('dotenv').config();

// Define Cache Location and API Endpoint
const CACHE_FILE_PATH = '_cache/webmentions.json';
const API = 'https://webmention.io/api';
const TOKEN = process.env.WEBMENTION_IO_TOKEN;

async function fetchWebmentions(since, perPage = 10000) {
  // If we dont have a domain name or token, abort
  if (!domain || !TOKEN) {
    console.warn('>>> unable to fetch webmentions: missing domain or token');
    return false;
  }

  let url = `${API}/mentions.jf2?domain=${domain}&token=${TOKEN}&per-page=${perPage}`;
  if (since) url += `&since=${since}`; // only fetch new mentions

  const response = await fetch(url);
  if (response.ok) {
    const feed = await response.json();
    console.log(`[Webmention] ${feed.children.length} new webmentions fetched from ${API}`);
    return feed;
  }

  return null;
}

// Merge fresh webmentions with cached entries, unique per id
function mergeWebmentions(a, b) {
  let union = unionBy(a.children, b.children, 'wm-id');
  union.sort((a, b) => {
    let aDate = new Date(a.published || a['wm-received']);
    let bDate = new Date(b.published || b['wm-received']);
    return aDate - bDate;
  });
  return union;
}

// save combined webmentions in cache file
function writeToCache(data) {
  const dir = '_cache';
  const fileContent = JSON.stringify(data, null, 2);
  // create cache folder if it doesnt exist already
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
  }
  // write data to cache json file
  fs.writeFile(CACHE_FILE_PATH, fileContent, err => {
    if (err) throw err;
  })
}

// get cache contents from json file
function readFromCache() {
  if (fs.existsSync(CACHE_FILE_PATH)) {
    const cacheFile = fs.readFileSync(CACHE_FILE_PATH);
    return JSON.parse(cacheFile);
  }

  // no cache found.
  return {
    lastFetched: null,
    children: []
  };
}

module.exports = async function () {
  const cache = readFromCache();

  // Only fetch new mentions in production
  if (process.env.ELEVENTY_ENV === 'production') {
    const feed = await fetchWebmentions(cache.lastFetched);
    if (feed) {
      const webmentions = {
        lastFetched: new Date().toISOString(),
        children: mergeWebmentions(cache, feed)
      };

      writeToCache(webmentions);
      return webmentions;
    }
  }

  return cache;
}