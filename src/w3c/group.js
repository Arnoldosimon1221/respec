// @ts-check
/**
 * @module w3c/group
 *
 * `group` is a shorthand configuration option for specifying `wg`, `wgId`,
 * `wgURI`, and `wgPatentURI` options.
 */

import { docLink, fetchAndCache, showError } from "../core/utils.js";

export const name = "w3c/group";

const W3C_GROUPS_API = "https://respec.org/w3c/groups/";
export async function run(conf) {
  if (!conf.group) {
    return;
  }

  const { group } = conf;
  const groupDetails = Array.isArray(group)
    ? await getMultipleGroupDetails(group)
    : await getGroupDetails(group);
  Object.assign(conf, groupDetails);
}

/** @param {string[]} groups */
async function getMultipleGroupDetails(groups) {
  const details = await Promise.all(groups.map(getGroupDetails));
  /** @type {{ [key in keyof GroupDetails]: GroupDetails[key][] }} */
  const result = {
    wg: [],
    wgId: [],
    wgURI: [],
    wgPatentURI: [],
    wgPatentPolicy: [],
    groupType: [],
  };
  for (const groupDetails of details.filter(o => o)) {
    for (const key of Object.keys(result)) {
      result[key].push(groupDetails[key]);
    }
  }
  return result;
}

/**
 * @param {string} group
 * @typedef {{ wgId: number, wg: string, wgURI: string, wgPatentURI: string, wgPatentPolicy: string, groupType: W3CGroupType }} GroupDetails
 * @returns {Promise<GroupDetails|undefined>}
 */
async function getGroupDetails(group) {
  let type = "";
  let shortname = group;
  if (group.includes("/")) {
    [type, shortname] = group.split("/", 2);
  }
  const url = new URL(`${shortname}/${type}`, W3C_GROUPS_API);
  const res = await fetchAndCache(url.href);
  if (res.ok) {
    const json = await res.json();
    const {
      id: wgId,
      name: wg,
      patentURI: wgPatentURI,
      patentPolicy: wgPatentPolicy,
      type: groupType,
      wgURI,
    } = json;
    return { wg, wgId, wgURI, wgPatentURI, wgPatentPolicy, groupType };
  }

  const text = await res.text();
  const message = `Failed to fetch group details (HTTP: ${res.status}). ${text}`;
  const hint =
    res.status === 404
      ? docLink`See the list of [supported group names](https://respec.org/w3c/groups/) to use with the ${"[group]"} configuration option.`
      : undefined;
  showError(message, name, { hint });
}
