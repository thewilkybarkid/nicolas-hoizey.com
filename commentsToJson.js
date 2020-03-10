#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const yfm = require('front-matter');

const rootDir = './src/_comments';

let comments = {};

fs.readdirSync(rootDir).forEach(commentFile => {
  if (parts = commentFile.match(/^([0-9]{4})-([0-9]{2})-([0-9]{2})-(.+)_[0-9-]+\.yml$/)) {
    let contentDir = path.join('articles', parts[1], parts[2], parts[3], parts[4]);
    if (!fs.existsSync(path.join('src', contentDir))) {
      console.log('Missing content:')
      console.log(path.join('src', contentDir));
      process.exit(-1);
    }
    let data = fs.readFileSync(path.join(rootDir, commentFile));
    var commentData = yfm(`${data}\n---\n`);
    var commentContent = commentData.attributes;

    // Clean data
    delete commentContent.updated;
    delete commentContent.post_id;
    if (commentContent.author.email === null) {
      delete commentContent.author.email;
    }
    if (commentContent.author.url === null) {
      delete commentContent.author.url;
    }

    if (comments[contentDir] === undefined) {
      comments[contentDir] = [];
    }
    comments[contentDir].push(commentContent);
  }
});

console.dir(comments);
fs.writeFileSync(path.join('src', '_data', 'comments.json'), JSON.stringify(comments));
