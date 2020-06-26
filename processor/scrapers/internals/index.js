/* eslint-disable */
// Many of these functions are passed into the page context

import { setPageBlockers, setPageScripts } from "../../setup/config";

export const getLinks = async ({ page, selectors }) =>
  page.evaluate((selectors) => {
    let rows = makeArrayFromDocument(selectors.rows);
    let links = rows.map((x) => getLink(x));
    return links.filter((x, i) => i + 1 <= selectors.depth && x); // Only return pages w/in depth range, prevents overfetching w/ puppeteer (and where x !== null)
  }, selectors);

export const getPageText = async (page) =>
  page.evaluate(() => {
    return document.body.innerText.replace(/[\s,\t\,\n]+/g, " ");
  });

export const getLinksAndData = async ({ page, selectors }) =>
  page.evaluate((selectors) => {
    let rows = makeArrayFromDocument(selectors.rows);
    return rows
      .filter((x, i) => i + 1 <= selectors.depth)
      .map((x) => {
        let link = getLink(x);
        let title = getLinkText(x);
        let location = getFromText(x, selectors.location);
        let date;
        let time;
        if (selectors.time) {
          time = getNthInstanceOfText(
            x,
            selectors.time.selector,
            selectors.time.instance
          );
        }
        if (selectors.date) {
          date = getNthInstanceOfText(
            x,
            selectors.date.selector,
            selectors.date.instance
          );
        }
        if (selectors.splitDate) {
          // If data includes splitDate...
          time = date.split(selectors.splitDate)[1];
          date = date.split(selectors.splitDate)[0];
        }
        return { link, title, location, date, time };
      });
  }, selectors);

export const getLinksAndDataV4 = async ({ page, selectors }) =>
  page.evaluate((selectors) => {
    let rows = Array.from(
      document
        .querySelector(selectors.upcomingHearings)
        .querySelectorAll(selectors.hearings)
    );
    return rows
      .filter((x, i) => i + 1 <= selectors.depth)
      .map((x) => {
        let link = getLink(x);
        let title = getLinkText(x);
        let dateAndTimeInfo = getFromText(x, selectors.dateTime)
          .split("-")
          .map((x) => x.trim());
        let date = dateAndTimeInfo[0];
        let time = dateAndTimeInfo[1];
        let location = getFromText(x, selectors.location);
        return { link, title, date, time, location };
      });
  }, selectors);

export const openNewPages = async (browser, links) => {
  let pages = await Promise.all(links.map(() => browser.newPage()));
  await Promise.all(
    pages.map(async (page, i) => {
      await setPageBlockers(page);
      await page.goto(links[i]);
      await setPageScripts(page);
      return page;
    })
  );
  return pages;
};

export const getLinksAndDataV4Unlimited = async ({ page, selectors }) =>
  page.evaluate((selectors) => {
    let rows = Array.from(document.querySelectorAll(selectors.hearings));
    return rows
      .filter((x, i) => i + 1 <= selectors.depth)
      .map((x) => {
        let link = getLink(x);
        let title = getLinkText(x);
        let dateAndTimeInfo = getFromText(x, selectors.dateTime)
          .split("-")
          .map((x) => x.trim());
        let date = dateAndTimeInfo[0];
        let time = dateAndTimeInfo[1];
        let location = getFromText(x, selectors.location);
        return { link, title, date, time, location };
      });
  }, selectors);

export const getPageData = async ({ pages, selectors }) =>
  Promise.all(
    pages.map(async (page) =>
      page.evaluate((selectors) => {
        debugger;
        let title = getTextFromDocument(selectors.title);
        let date = null;
        let time = null;
        let location = null;

        if (selectors.date) {
          date = selectors.date.label
            ? getNextTextFromDocument(selectors.date.value)
            : getTextFromDocument(selectors.date.value);
        }
        if (selectors.location) {
          selectors.location.label
            ? getNextTextFromDocument(selectors.location.value)
            : getTextFromDocument(selectors.location.value);
        }
        if (selectors.time) {
          time = selectors.time.label
            ? getNextTextFromDocument(selectors.time.value)
            : getTextFromDocument(selectors.time.value);
        }
        if (selectors.regexTime) {
          let myTimeRegex = new RegExp(
            /((1[0-2]|0?[1-9]):([0-5][0-9]) ?([AaPp]\.?[Mm]\.?)?)/
          );
          let isMatch = document.body.innerText.match(myTimeRegex);
          if (!isMatch) {
            time = null;
          } else {
            time = isMatch[0];
          }
        }
        if (selectors.regexDate) {
          let myDateRegex = new RegExp(
            /(monday|tuesday|wednesday|thursday|friday|saturday|sunday)?,? ?(January|February|March|April|May|June|July|August|September|October|November|December) ([0-9][0-9]?),? \d\d\d\d/,
            "gi"
          );
          let isMatch = document.body.innerText.match(myDateRegex);
          if (!isMatch) {
            date = null;
          } else {
            date = isMatch[0];
          }
        }

        if (selectors.splitDate) {
          // If data includes splitDate...
          time = date ? date.split(selectors.splitDate)[1] : null; // If date isn't found...
          date = date ? date.split(selectors.splitDate)[0] : null;
        }
        let link = document.URL;
        let text = document.body.innerText.replace(/[\s,\t\,\n]+/g, " ");

        return {
          title,
          date,
          time,
          location,
          link,
          text,
        };
      }, selectors)
    )
  );

export const getPageDataWithJQuery = async ({ pages, selectors }) =>
  Promise.all(
    pages.map(async (page) => {
      return page.evaluate((selectors) => {
        let title = getTextFromDocument(selectors.title);
        // This complicated function turns the location, date, and time into an array
        let info = $(selectors.jquerySelector)
          .contents()[1]
          .textContent.split("\n")
          .map((x) => x.trim())
          .filter((x) => x !== "" && x !== "@" && x !== "0");
        let location =
          selectors.locationIndex === null
            ? null
            : info[selectors.locationIndex];
        let date =
          selectors.dateIndex === null ? null : info[selectors.dateIndex];
        let time =
          selectors.timeIndex === null ? null : info[selectors.timeIndex];
        let link = document.URL;
        let text = document.body.innerText.replace(/[\s,\t\,\n]+/g, " ");
        return {
          title,
          date,
          time,
          location,
          link,
          text,
        };
      }, selectors);
    })
  );
