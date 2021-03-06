/**
 * Copyright (c) Microsoft Corporation.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

module.exports.describe = function ({ testRunner, expect }) {
  const {describe, xdescribe, fdescribe} = testRunner;
  const {it, fit, xit, dit} = testRunner;
  const {beforeAll, beforeEach, afterAll, afterEach} = testRunner;

  describe('provisional page', function() {
    it('extraHttpHeaders should be pushed to provisional page', async({page, server}) => {
      await page.goto(server.EMPTY_PAGE);
      const pagePath = '/one-style.html';
      server.setRoute(pagePath, async (req, res) => {
        await page.setExtraHTTPHeaders({ foo: 'bar' });
        server.serveFile(req, res, pagePath);
      });
      const [htmlReq, cssReq] = await Promise.all([
        server.waitForRequest(pagePath),
        server.waitForRequest('/one-style.css'),
        page.goto(server.CROSS_PROCESS_PREFIX + pagePath)
      ]);
      expect(htmlReq.headers['foo']).toBe(undefined);
      expect(cssReq.headers['foo']).toBe('bar');
    });
    it('should continue load when interception gets disabled during provisional load', async({page, server}) => {
      await page.goto(server.EMPTY_PAGE);
      await page.setRequestInterception(true);
      expect(await page.evaluate(() => navigator.onLine)).toBe(true);
      let intercepted = null;
      const order = [];
      page.on('request', request => {
        intercepted = page.setRequestInterception(false).then(() => order.push('setRequestInterception'));
      });
      const response = await page.goto(server.CROSS_PROCESS_PREFIX + '/empty.html').then(response => {
        order.push('goto');
        return response;
      });
      // Should intercept a request.
      expect(intercepted).not.toBe(null);
      await intercepted;
      // Should continue on disabling and load successfully.
      expect(response.status()).toBe(200);
      // Should resolve setRequestInterception before goto.
      expect(order[0]).toBe('setRequestInterception');
      expect(order[1]).toBe('goto');
    });
  });
};
