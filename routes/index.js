'use strict';
const express = require("express");
const router = express.Router();
const getAngles = require("../components/solarangles");
const vars = require("../components/vars");
const { userValidationRules, validate, getBoolean } = require('../components/validate.js')
const cheerio = require("cheerio");
const axios = require("axios");
const tai = require("t-a-i");
const NodeCache = require( "node-cache" );
const { CanvasRenderService } = require('chartjs-node-canvas');
//const { delete } = require("../routes");
const myCache = new NodeCache( { stdTTL: 86400 } );

const fetchTerestrialTime = async () => {
    const ttResult = await axios.get("https://data.iers.org/eris/eopOfToday/eopoftoday.php");
    return cheerio.load(ttResult.data);
};


router.get("/", userValidationRules(), validate, async (req, res, next) => {
        try {
            const values = await getValues(req);       
            const results = await getSpaResults(values);
            if (getBoolean(req.query.json)) {
                res.json(results);
            } else {
                res.render("index", {results: results});
            }
        } catch (e) {
            next(e);
        }
    }
);

router.get("/graphs/elevation", userValidationRules(), validate, async (req, res, next) => {
    try {
        const values = await getValues(req);
        // set defaults for a basic page browse - one day (today), 15m increments
        if(values.multi === undefined) values.multi=true;
        if(values.interval === undefined) values.interval = ['15m', '15', 'm'];
        if(values.start_hour === undefined) values.start_hour = 0;
        if(values.end_hour === undefined) values.end_hour = 24;
        const results = await getSpaResults(values);
        const elevations = results.results.map(elev => elev.e);
        const times = results.results.map(leTime => leTime.hour.toString().padStart(2,"0") + ":" + leTime.minute.toString().padStart(2,"0"));
        const chartConfig = {
            type: 'line',
            data: {
                labels: times,
                datasets: [{
                    label: 'Solar Elevation Angle (degrees)',
                    data: elevations,
                    borderColor: 'rgba(75, 192, 192, 1)',
                    backgroundColor: 'rgba(75, 192, 192, 0.2)',
                }]
            },
        };
        const canvasRenderService = new CanvasRenderService(values.w, values.h)
        let image = await canvasRenderService.renderToBuffer(chartConfig);
        res.type("image/png")
        res.send(image) 
        //res.render("elevation", {results: results});
    } catch (e) {
        next(e);
    }
}
);

// views to implement:
// graphs (limited params)
// different function types in request? 

router.post("/", userValidationRules(), validate, async (req, res, next) => {

    try {
        const values = await getValues(req);       
        const results = await getSpaResults(values);
        if (getBoolean(req.body.json)) {
            res.json(results);
        } else {
            res.render("index", {results: results});
        }
    } catch (e) {
        next(e);
    }
});

async function getValues(req) {
    let rightNow = new Date();

    // map values into their proper spots
    // provide some sane defaults for things not passed
    const newReq = req.method === "GET" ? req.query : req.body;
    let values = {};

    // Since DUT1 is yanked from the web and technically speaking it's not an API service but a scrape from IERS,
    // cache the value for a day and only scrape the web site when it expires. Realistically it could be 
    // cached longer than that as DUT1 isn't updated very often. It's also arguably moot, but the calculations
    // call for it in the SPA so why not.

    // get DUT1 from the cache
    // let delta_ut1 = myCache.get("dut1");
    let delta_ut1 = -0.18646;
    // wasn't in the cache, get it from the web
    if (delta_ut1 === undefined) {
        console.log("dut1 cache miss");
        const $tt = await fetchTerestrialTime();
        values.delta_ut1 = parseFloat($tt('table tbody tr:nth-child(3) td:nth-child(2)').text())/1000;
        myCache.set("dut1", values.delta_ut1, 86400);
        console.log("dut1 Cached value: ", values.delta_ut1);
    } else {
        console.log("dut1 was in cache, using value: " + delta_ut1);
        values.delta_ut1 = delta_ut1;
    }

    // note that the t-a-i package doesn't really do anything special for TAI values after 1961 and under the
    // hood really is just returning a hard-coded value for this; I could hard code the value too but
    // the hope is that if/when TAI gets updated again, the package will also update and this will continue
    // to be correct with little more than a rebuild of the app. 

    let offset = (tai.unixToAtomic(rightNow.getTime()) - rightNow.getTime())/1000;
    values.delta_t = (32.184 + offset) - values.delta_ut1;

    values.latitude = newReq.latitude || 53.5461;
    values.longitude = newReq.longitude || -113.4938;
    if (!newReq.tz) {
        values.tz = parseFloat(-(rightNow.getTimezoneOffset())/60) // note the inverted sign
    } else {
        values.tz = newReq.tz; 
    }
    if (newReq.elevation !== undefined) {
        // not using shorthand here because 0 is a valid elevation which causes it to short-circuit
        values.elevation = newReq.elevation;
    } else {
        values.elevation = 645;
    }
    values.avg_pressure = newReq.avg_pressure || 1018;
    values.avg_temperature = newReq.avg_temperature || 2.7;
    values.year = newReq.year || rightNow.getFullYear();
    values.month = newReq.month || rightNow.getMonth() + 1; // javascript uses 0 indexed months because wat
    values.day = newReq.day  || rightNow.getDate();
    values.hour = newReq.hour || rightNow.getHours();
    // provide a couple of sensible defaults
    if (values.hour === 24) {
        values.minute = 0;
    } else if (!newReq.minute) {
        values.minute = rightNow.getMinutes();
    } else {
        values.minute = newReq.minute;
    }
    if (values.hour === 24) {
        values.second = 0;
    } else if (!newReq.second) {
        values.second = rightNow.getSeconds();
    } else {
        values.second = newReq.minute;
    }
    values.slope = newReq.slope || 0;
    values.azm_rotation = newReq.azm_rotation || 0;
    values.atmos_refract = newReq.atmos_refract || 0.5667;
    values.function = getFunction(newReq.function) || vars.SPA_ALL;
    values.multi = newReq.multi;
    values.start_hour = newReq.start_hour;
    values.end_hour = newReq.end_hour;
    if (!newReq.start_minute) {
        values.start_minute = 0;
    } else {
        values.start_minute = newReq.start_minute;
    }
    if (values.end_hour === 24 || !newReq.end_minute) {
        values.end_minute = 0;
    } else {
        values.end_minute = newReq.end_minute;
    }
    if (!newReq.start_second) {
        values.start_second = 0;
    } else {
        values.start_second = newReq.start_second;
    }
    if (values.end_hour === 24 || !newReq.end_second) {
        values.end_second = 0;
    } else {
        values.end_second = newReq.end_second;
    }
    values.interval = newReq.interval;
    values.w = newReq.w || 1280;
    values.h = newReq.h || 720;
    //console.log("Values: ", values)

    return values;
}

function getFunction(value) {

    switch(value){
        case "SPA_ZA_INC":
        case "1":
        case 1:
            return vars.SPA_ZA_INC;
        case "SPA_ZA_RTS":
        case "2":
        case 2:
            return vars.SPA_ZA_RTS;
        case "SPA_ALL":
        case "3":
        case 3:
            return vars.SPA_ALL;
        default: 
            return vars.SPA_ALL;
    }
}

async function getSpaResults(values) {
    let results = {
        results: []
    };
    let result;
    if (values.multi === true) {
        console.log("gonna do multiple calcalations");
        let startDate = new Date(values.year, values.month-1, values.day, values.start_hour, values.start_minute, values.start_second);
        let endDate = new Date(values.year, values.month-1, values.day, values.end_hour, values.end_minute, values.end_second);
        let dateDiff = (endDate-startDate)/1000;
        let interval;
        
        switch (values.interval[2]) {
            case "h":
                interval = values.interval[1] * 3600;
                break; 
            case "m":
                interval = values.interval[1] * 60;
                break;
            default:
                interval = values.interval[1];
        }

        let intervals;
        if ( Math.floor(dateDiff / interval) === 0) {
            intervals = 1;
        } else {
            intervals = Math.floor(dateDiff / interval);
        };
        
        for (let i = 0; i < intervals; i++) {
            let hours, mins, secs;
            hours = startDate.getHours();
            mins = startDate.getMinutes();
            secs = startDate.getSeconds();
            result = await getAngles(values.year, values.month, values.day, hours, mins, secs, values.tz, values.latitude, 
                values.longitude, values.elevation, values.avg_pressure, values.avg_temperature, values.slope, 
                values.azm_rotation, values.atmos_refract, values.function, values.delta_ut1, values.delta_t)
            if (i === 0) {
                results.delta_ut1 = result.delta_ut1;
                results.delta_t = result.delta_t;
                results.suntransit = result.suntransit;
                results.sunrise = result.sunrise;
                results.sunset = result.sunset;
                results.ssha = result.ssha;
                results.sta = result.sta;
                results.srha = result.srha;
                results.azm_rotation = result.azm_rotation;
                results.atmos_refract = result.atmos_refract;
                results.slope = result.slope;
                results.sunrise_hr = result.sunrise_hr;
                results.sunset_hr = result.sunset_hr;
                results.suntransit_hr = result.suntransit_hr;
            }
            delete result.delta_ut1;
            delete result.delta_t;
            delete result.suntransit;
            delete result.sunrise;
            delete result.sunset;
            delete result.ssha;
            delete result.sta;
            delete result.srha;
            delete result.azm_rotation;
            delete result.atmos_refract;
            delete result.slope;
            delete result.sunset_hr;
            delete result.sunrise_hr;
            delete result.suntransit_hr;
            results.results.push(result);
            startDate.setMilliseconds(interval * 1000);
            // console.log(startDate);
        }
        // console.log("startdate: ", startDate, "end date: ", endDate, "difference:", dateDiff, "interval:", interval, "intervals:", intervals)
    } else {
        result = (await getAngles(values.year, values.month, values.day, values.hour, values.minute, values.second, values.tz, 
            values.latitude, values.longitude, values.elevation, values.avg_pressure, values.avg_temperature, values.slope, 
            values.azm_rotation, values.atmos_refract, values.function, values.delta_ut1, values.delta_t));
        results.delta_ut1 = result.delta_ut1;
        results.delta_t = result.delta_t;
        results.suntransit = result.suntransit;
        results.sunrise = result.sunrise;
        results.sunset = result.sunset;
        results.ssha = result.ssha;
        results.sta = result.sta;
        results.srha = result.srha;
        results.azm_rotation = result.azm_rotation;
        results.atmos_refract = result.atmos_refract;
        results.slope = result.slope;
        results.sunrise_hr = result.sunrise_hr;
        results.sunset_hr = result.sunset_hr;
        results.suntransit_hr = result.suntransit_hr;
        delete result.delta_ut1;
        delete result.delta_t;
        delete result.suntransit;
        delete result.sunrise;
        delete result.sunset;
        delete result.ssha;
        delete result.sta;
        delete result.srha;
        delete result.azm_rotation;
        delete result.atmos_refract;
        delete result.slope;
        delete result.sunset_hr;
        delete result.sunrise_hr;
        delete result.suntransit_hr;
        results.results.push(result);
        results.results.push();
    }      
    results.year = values.year;
    results.month = values.month.toString().padStart(2, '0');
    results.day = values.day.toString().padStart(2, '0');
    results.tz = values.tz;
    results.latitude = values.latitude;
    results.longitude = values.longitude;
    results.elevation = values.elevation;
    results.avg_pressure = values.avg_pressure;
    results.avg_temperature = values.avg_temperature;
    results.atmos_refract = values.atmos_refract;
    results.slope = values.slope;
    results.version = vars.vers;
    results.hostname = vars.hostname;
    results.azureBuildNumber = vars.azureBuildNumber;
    return results;
}

module.exports = router;