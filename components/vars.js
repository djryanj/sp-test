/*
* vars.js
* provides some functions for getting variables that should be globally available
*
*/
'use strict';
const fs = require("fs");
const os = require("os");
const hostname = os.hostname();

const SPA_ZA = 0; //calculate zenith and azimuth - not actually implemented
const SPA_ZA_INC = 1; //calculate zenith, azimuth, and incidence
const SPA_ZA_RTS = 2; //calculate zenith, azimuth, and sun rise/transit/set values
const SPA_ALL = 3; //calculate all SPA output values

// when running in a docker container, pass in the BUILDID which will
// be equal to the short git commit ID. The .git folder is explicitly
// dockerignore'd, so the relevant information will not otherwise be
// available inside the container.

if (process.env.BUILDID) {
    var gitCommit = (process.env.BUILDID).toString().substring(0, 7);
} else {
    var gitCommit = getLocalGit();
}

const azureBuildNumber = process.env.BUILDNUMBER || "local";
const environment = process.env.SOURCEBRANCHNAME || "local";
const vers = process.env.npm_package_version + "-" + environment + "-" + gitCommit;

function getLocalGit() {
    try {
        const rev = fs.readFileSync('.git/HEAD').toString();
        if (rev.indexOf(':') === -1) {
            return rev;
        } else {
            return fs.readFileSync('.git/' + rev.substring(5, rev.length - 1)).toString().substring(0, 7);
        }
    } catch (e) {
        return "missingBuildId";
    }
}

module.exports = {
    azureBuildNumber : azureBuildNumber,
    vers : vers,
    hostname : hostname,
    SPA_ALL: SPA_ALL,
    SPA_ZA: SPA_ZA,
    SPA_ZA_INC: SPA_ZA_INC,
    SPA_ZA_RTS: SPA_ZA_RTS,
}