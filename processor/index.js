// import path from "path";
import dotenv from "dotenv";
dotenv.config({ path: `./envs/.${process.env.NODE_ENV}.env` });

import Bull from "bull";
import { setupPuppeteer } from "./setup";
import { logger } from "./loggers/winston";
import { pickScraper } from "./scrapers";

const setup = async () => {
  try {
    var { browser, page } = await setupPuppeteer({ type: "tor" });
  } catch (err) {
    logger.error("Could not setup browser.");
    throw err;
  }

  try {
    var queue = new Bull("myQueue", {
      redis: {
        port: process.env.REDIS_PORT,
        host: process.env.REDIS_URL,
        password: process.env.REDIS_PASSWORD,
      },
    });
    logger.info("Connected to queue from job producer.");
  } catch (err) {
    logger.error("Could not connect to queue.");
    throw err;
  }

  return { queue, browser, page };
};

setup()
  .then(({ queue, browser }) => {
    logger.info("Processor successfully set up.");
    queue.process(async (job) => {
      try {
        logger.info(`Running ${job.id} for ${job.data.collection}`);
        const data = job.data;
        const scraper = pickScraper(data);
        const results = await scraper(browser, data, job.timestamp);

        logger.info(`Completed ${job.id} for ${data.collection}`);
        return results; // Return results to the Bull listener
      } catch (err) {
        let oldPages = await browser.pages();
        await Promise.all(
          oldPages.map(async (page, i) => i > 0 && (await page.close()))
        );
        logger.error(`Job ${job.id} could not be processed. `, err);
      }
    });
  })
  .catch((err) => {
    logger.error("There was an error with the processor. ", err);
    process.exit(1);
  });