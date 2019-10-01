const express = require('express');
const rp = require('request-promise');
const list = require("../servers")
const router = express.Router();

const CHECK_DELAY = 1000 * 60 * 60;
let history = [];

const extractWebsites = list
  .map(({ websites }) => websites)
  .reduce((prev = [], cur) => prev.concat(cur));

function getLastDowntime(url2) {
  const index = history.findIndex(({ url, to }) => url === url2 && to === "now");
  return {
    index,
    currentDowntime: history[index],
  };
}

setInterval(async () => {
  const currentStatus = await Promise.all(extractWebsites.map(getStatusObject));
  currentStatus.forEach((statusObject) => {
    const { index, currentDowntime } = getLastDowntime(statusObject.url);
    if (statusObject.online) {
      if (currentDowntime != null) {
        history[index].to = new Date();
      }
    } else {
      if (currentDowntime == null) {
        history.push({
          ...statusObject,
          from: new Date(),
          to: "now",
        });
      }
    }
  });
}, CHECK_DELAY);

async function checkStatus(url) {
  return rp({
    uri: url,
    timeout: 2000,
  }).then(() => {
    return true;
  }).catch(() => {
    return false;
  })
}

async function getStatusObject(url) {
  return {
    url,
    online: await checkStatus("http://" + url),
    https: await checkStatus("https://" + url),
    date: new Date(),
  }
}

router.get('/', async (req, res, next) => {
  const currentStatus = await Promise.all(extractWebsites.map(getStatusObject));
  res.render('index', { list, currentStatus, history, });
});

module.exports = router;
