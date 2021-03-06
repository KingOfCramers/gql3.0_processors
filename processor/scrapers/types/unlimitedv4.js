import randomUser from "random-useragent";

import { getLinksAndDataV4Unlimited } from "../internals";
import { logger } from "../../loggers/winston";
import { setPageBlockers, setPageScripts } from "../../setup/config";
import { asyncForEach, wait } from "../../../util";

export default async (browser, job) => {
  // Setup initial list of links
  let baseLink = job.phaseOne.baseLink;
  let allLinks = job.phaseOne.range.map((x) =>
    baseLink.replace("SUBSTITUTE", x)
  );

  let results = [];

  await asyncForEach(allLinks, async (link) => {
    // If needed, wait...
    if (job.nice) {
      logger.info(`Being nice for ${job.nice / 1000} seconds...`);
      await wait(job.nice);
      logger.info(`Continuing...`);
    }
    let page;
    try {
      page = await browser.newPage();
      await setPageBlockers(page);
      await page.goto(link);
      await setPageScripts(page);
      let userAgentString = randomUser.getRandom();
      await page.setUserAgent(userAgentString);
    } catch (err) {
      logger.error("Could not navigate to inital page. ", err);
      throw err;
    }

    let dataWithLinks;
    // Go to link and get all sub-links
    try {
      dataWithLinks = await getLinksAndDataV4Unlimited({
        page,
        selectors: job.phaseTwo,
      });
    } catch (err) {
      logger.error("Could not get links. ", err);
      throw err;
    }

    // Close each page
    try {
      let pages = await browser.pages();
      await Promise.all(pages.map(async (page) => await page.close()));
    } catch (err) {
      logger.error("Could not close pages. ", err);
      throw err;
    }

    // Add the pageData to the results array
    results.push(...dataWithLinks);
  });

  return results;
};
