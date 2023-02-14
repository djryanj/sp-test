'use strict;'
const { check, validationResult} = require('express-validator');
var moment = require('moment-timezone');

const re = /(^\d*)([hms]?$)/i;

const userValidationRules = () => {
    return [
        // require latitude if longitude and vice versa
        check('latitude')
        .isFloat().withMessage('latitude must be a number between -90 and 90 (negative south of equator).').bail()
        .custom((value, {
            req
        }) => {
            // console.log(req.path)
            const newReq = req.method === "GET" ? req.query : req.body;
            if (Math.abs(value) > 90) {
                throw new Error('latitude must be a number between -90 and 90 (negative south of equator).')
            } else if (newReq.longitude === undefined) {
                throw new Error('longitude is required if latitude is supplied.')
            } else {
                return true;
            }
        }).optional()
        .toFloat(),
        check('longitude')
        .isFloat().withMessage('longitude must be a number between -180 and 180  (negative west of Greenwich).').bail()
        .custom((value, {
            req
        }) => {
            const newReq = req.method === "GET" ? req.query : req.body;
            if (Math.abs(value) > 180) {
                throw new Error('longitude must be a number between -180 and 180  (negative west of Greenwich).')
            } else if (newReq.latitude === undefined) {
                throw new Error('latitude is required if longitude is supplied.')
            } else {
                return true;
            }
        }).optional()
        .toFloat(),
        // require all of day, month, and year if any is supplied
        check('year')
        .isInt().withMessage('year must be an integer between -2000 and 6000.').bail()
        .custom((value, {
            req
        }) => {
            const newReq = req.method === "GET" ? req.query : req.body;
            if (value < -2000 || value > 6000) {
                throw new Error('year must be an integer between -2000 and 6000.')
            } else if (newReq.month === undefined) {
                throw new Error('month is required if year is supplied.')
            } else if (newReq.day === undefined) {
                throw new Error('day is required if year is supplied.')
            } else {
                return true;
            }
        }).optional()
        .toInt(),
        check('month')
        .isInt().withMessage('month must be an integer between 1 and 12.').bail()
        .custom((value, {
            req
        }) => {
            const newReq = req.method === "GET" ? req.query : req.body;
            if (value < 1 || value > 12) {
                throw new Error('month must be an integer between 1 and 12.')
            } else if (newReq.year === undefined) {
                throw new Error('year is required if month is supplied.')
            } else if (newReq.day === undefined) {
                throw new Error('day is required if month is supplied.')
            } else {
                return true;
            }
        }).optional()
        .toInt(),
        check('day')
        .isInt().withMessage('day must be an integer between 1 and 31.').bail()
        .custom((value, {
            req
        }) => {
            const newReq = req.method === "GET" ? req.query : req.body;
            if (value < 1 || value > 31) {
                throw new Error('day must be an integer between 1 and 31.')
            } else if (newReq.year === undefined) {
                throw new Error('year is required if day is supplied.')
            } else if (newReq.month === undefined) {
                throw new Error('month is required if day is supplied.')
            } else if (!isValidDate(value, newReq.month, newReq.year)) {
                throw new Error('Invalid day ('+value+') specified for month '+newReq.month+' in year '+newReq.year+'. Please specify a valid day.')
            } else {
                return true;
            }
        }).optional()
        .toInt(),
        check('hour')
        .isInt().withMessage('hour must be an integer between 0 and 24.').bail()
        .custom((value, {
            req
        }) => {
            const newReq = req.method === "GET" ? req.query : req.body;
            if (value < 0 || value > 24) {
                throw new Error('hour must be an integer between 0 and 24.');
            } else if (newReq.minute && (value == 24 && newReq.minute > 0)) {
                throw new Error('minute must be 0 (or omitted) if hour is 24.');
            } else if (newReq.second && (value == 24 && newReq.second > 0)) {
                throw new Error('second must be 0 (or omitted) if hour is 24.');
            } else {
                return true;
            }
        }).optional()
        .toInt(),
        check('minute')
        .isInt().withMessage('minute must be an integer between 0 and 59.').bail()
        .custom((value) => {
            if (value < 0 || value > 59) {
                throw new Error('minute must be an integer between 0 and 59.');
            } else {
                return true;
            }
        }).optional()
        .toInt(),
        check('second')
        .isInt().withMessage('second must be an integer between 0 and 59.').bail()
        .custom((value) => {
            if (value < 0 || value > 59) {
                throw new Error('second must be an integer between 0 and 59.');
            } else {
                return true;
            }
        }).optional()
        .toInt(),
        check('tz')
        .trim().stripLow()
        .custom((value) => {
            if (isNaN(value)) {
                // should be a non-numeric string e.g 'America/Edmonton'
                if (!moment.tz(value).utcOffset()) {
                    throw new Error("Unknown TZ input format. Please use timezone like 'America/Edmonton' or numeric value e.g. -6 (negative west of Greenwich).");
                }
                else {
                    return true;
                }
            } else if (value < -18 || value > 18) {
                throw new Error('tz (timezone) must be an integer between -18 and 18 (negative west of Greenwich).');
            } else {
                return true;
            }
        }).optional()
        .customSanitizer((value) => {
            if (isNaN(value)) {
                return moment.tz(value).utcOffset() / 60.0;
            } else {
                return parseFloat(value);
            }
        }),
        check('avg_pressure')
        .isFloat().withMessage('avg_pressure must be a number between 0 and 5000 (in millibars).').bail()
        .custom((value) => {
            if (value < 0 || value > 5000) {
                throw new Error('avg_pressure must be a number between 0 and 5000 (in millibars).');
            } else {
                return true;
            }
        }).optional()
        .toFloat(),
        check('elevation')
        .isFloat().withMessage('elevation must be a number higher than -6500000 (in meters).').bail()
        .custom((value) => {
            if (value < -6500000) {
                throw new Error('elevation must be a number higher than -6500000 (in meters).');
            } else {
                return true;
            }
        }).optional()
        .toFloat(),
        check('avg_temperature')
        .isFloat().withMessage('avg_temperature must be a number between -273 and 6000 (degrees celcius).').bail()
        .custom((value) => {
            if (value < -273 || value > 6000) {
                throw new Error('avg_temperature must be a number between -273 and 6000 (degrees celcius).');
            } else {
                return true;
            }
        }).optional()
        .toFloat(),
        check('slope')
        .isFloat().withMessage('slope must be a number between -360 and 360 (degrees from the horizontal plane).').bail()
        .custom((value) => {
            if (Math.abs(value) > 360) {
                throw new Error('slope must be a number between -360 and 360 (degrees from the horizontal plane).');
            } else {
                return true;
            }
        }).optional()
        .toFloat(),
        check('azm_rotation')
        .isFloat().withMessage('azm_rotation must be a number between -360 and 360 (measured from south to projection of surface normal on horizontal plane, negative east).').bail()
        .custom((value) => {
            if (Math.abs(value) > 360) {
                throw new Error('azm_rotation must be a number between -360 and 360 (measured from south to projection of surface normal on horizontal plane, negative east).');
            } else {
                return true;
            }
        }).optional()
        .toFloat(),
        check('atmos_refract')
        .isFloat().withMessage('atmos_refract must be a number between -5 and 5 (degrees, 0.5667 is typical).').bail()
        .custom((value) => {
            if (Math.abs(value) > 5) {
                throw new Error('atmos_refract must be a number between -5 and 5 (degrees, 0.5667 is typical).');
            } else {
                return true;
            }
        }).optional()
        .toFloat(),
        check('function')
        .trim().stripLow()
        .custom((value) => {
            if (value !== "SPA_ALL" && value !== "SPA_ZA_RTS" && value !== "SPA_ZA_INC") {
                throw new Error('function must be one of: SPA_ALL, SPA_ZA_RTS, SPA_ZA_INC.');
            } else {
                return true;
            }
        }).optional(),
        check('json')
        .customSanitizer((value) => {
            return getBoolean(value);
        }).optional(),
        check('multi')
        .custom((value, {
            req
        }) => {
            if (getBoolean(value)) {
                const newReq = req.method === "GET" ? req.query : req.body;
                if (newReq.hour || newReq.minute || newReq.second) {
                    throw new Error('If multi is desired, hour, minute, and second cannot be used (use start_hour, end_hour, start_minute, end_minute, start_second, end_second).');
                } else if (newReq.start_hour === undefined) {
                    throw new Error('If multi is desired, start_hour is required.');
                } else if (newReq.end_hour === undefined) {
                    throw new Error('If multi is desired, end_hour is required.');
                } else if (newReq.interval === undefined) {
                    throw new Error('If multi is desired, interval is required.');
                } else {
                    return true;
                }
            } else {
                return true;
            }
        })
        .customSanitizer((value) => {
            return getBoolean(value);
        }).optional(),
        check('start_hour')
        .isInt().withMessage('start_hour must be an integer between 0 and 24.').bail()
        .custom((value, {
            req
        }) => {
            const newReq = req.method === "GET" ? req.query : req.body;
            if (value < 0 || value > 23) {
                throw new Error('start_hour must be an integer between 0 and 23.');
            } else if (newReq.hour) {
                throw new Error('hour cannot be used with start_hour.');
            } else if (newReq.end_hour === undefined) {
                throw new Error('end_hour must be supplied if start_hour is used.');
            } else if (value > newReq.end_hour) {
                throw new Error('end_hour must be after start_hour.');
            } else {
                return true;
            }
        }).optional()
        .toInt(),
        check('start_minute')
        .isInt().withMessage('start_minute must be an integer between 0 and 59.').bail()
        .custom((value, {
            req
        }) => {
            const newReq = req.method === "GET" ? req.query : req.body;
            if (value < 0 || value > 59) {
                throw new Error('start_minute must be an integer between 0 and 59.');
            } else if (newReq.start_hour === undefined){
                throw new Error('start_hour is required when start_minute is supplied.');
            } else if (newReq.end_hour === undefined) {
                throw new Error('end_hour is required when start_minute is supplied.');
            } else if (newReq.minute) {
                throw new Error('minute cannot be used with start_minute.');
            } else if (newReq.end_minute === undefined) {
                throw new Error('end_minute must be supplied if start_minute is used.');
            } else if (value > newReq.end_minute && newReq.start_hour === newReq.end_hour) {
                throw new Error('end_minute must be after start_minute in the same hour.');
            } else {
                return true;
            }
        }).optional()
        .toInt(),
        check('start_second')
        .isInt().withMessage('start_second must be an integer between 0 and 59.').bail()
        .custom((value, {
            req
        }) => {
            const newReq = req.method === "GET" ? req.query : req.body;
            if (value < 0 || value > 59) {
                throw new Error('start_second must be an integer between 0 and 59.');
            } else if (newReq.start_hour === undefined){
                throw new Error('start_hour is required when start_second is supplied.');
            } else if (newReq.end_hour === undefined) {
                throw new Error('end_hour is required when start_second is supplied.');
            } else if (newReq.end_minute === undefined) {
                throw new Error('end_minute must be supplied if start_second is used.');
            } else if (newReq.start_minute === undefined) {
                throw new Error('start_minute must be supplied if start_second is used.');
            } else if (newReq.second) {
                throw new Error('second cannot be used with start_second.');
            } else if (newReq.end_second === undefined) {
                throw new Error('end_second must be supplied if start_second is used.');
            } else {
                return true;
            }
        }).optional()
        .toInt(),
        check('end_hour')
        .isInt().withMessage('end_hour must be an integer between 0 and 24.').bail()
        .custom((value, {
            req
        }) => {
            const newReq = req.method === "GET" ? req.query : req.body;
            if (value < 0 || value > 24) {
                throw new Error('end_hour must be an integer between 0 and 24.');
            } else if (newReq.hour) {
                throw new Error('hour cannot be used with end_hour.');
            } else if (newReq.start_hour === undefined) {
                throw new Error('start_hour must be supplied if end_hour is used.');
            } else {
                return true;
            }
        }).optional()
        .toInt(),
        check('end_minute')
        .isInt().withMessage('end_minute must be an integer between 0 and 59.').bail()
        .custom((value, {
            req
        }) => {
            const newReq = req.method === "GET" ? req.query : req.body;
            if (value < 0 || value > 59) {
                throw new Error('end_minute must be an integer between 0 and 59.');
            } else if (newReq.start_hour === undefined){
                throw new Error('start_hour is required when end_minute is supplied.');
            } else if (newReq.end_hour === undefined) {
                throw new Error('end_hour is required when end_minute is supplied.');
            } else if (newReq.minute) {
                throw new Error('minute cannot be used with end_minute.');
            } else if (value < newReq.start_minute && (newReq.start_hour == newReq.end_hour)) {
                throw new Error('end_minute must be after start_minute in the same hour.');
            } else if (value > 0 && newReq.end_hour === 24) {
                throw new Error('end_minute must be 0 (or omitted) if end_hour is 24.')
            } else if (newReq.start_minute === undefined) {
                throw new Error('start_minute must be supplied if end_minute is used.');
            } else {
                return true;
            }
        }).optional()
        .toInt(),
        check('end_second')
        .isInt().withMessage('end_second must be an integer between 0 and 59.').bail()
        .custom((value, {
            req
        }) => {
            const newReq = req.method === "GET" ? req.query : req.body;
            if (value < 0 || value > 59) {
                throw new Error('end_second must be an integer between 0 and 59.');
            } else if (newReq.start_hour === undefined){
                throw new Error('start_hour is required when end_second is supplied.');
            } else if (newReq.end_hour === undefined) {
                throw new Error('end_hour is required when end_second is supplied.');
            } else if (newReq.end_minute === undefined) {
                throw new Error('end_minute must be supplied if end_second is used.');
            } else if (newReq.start_minute === undefined) {
                throw new Error('start_minute must be supplied if end_second is used.');
            } else if (newReq.second) {
                throw new Error('second cannot be used with end_second.');
            } else if (newReq.start_second === undefined) {
                throw new Error('start_second must be supplied if end_second is used.');
            } else if (value < newReq.start_second && newReq.start_minute === newReq.end_minute) {
                throw new Error('end_second must be after start_second in the same minute.');
            } else if (value > 0 && newReq.end_hour === 24) {
                throw new Error('end_second must be 0 (or omitted) if end_hour is 24.')
            } else {
                return true;
            } // start hour and end hour equal means that start minute and end minute must be set
        }).optional()
        .toInt(), 
        check('interval')
        .trim().stripLow()
        .matches(re).withMessage('interval must be in a format like nnnI, where nnn is the number and I is one of s (seconds), m (minutes), or h (hours).')
        .custom((value, {
            req
        }) => {
            const newReq = req.method === "GET" ? req.query : req.body;
            const interval = [...value.match(re)];
            interval[2] = interval[2].toLowerCase();
            if (newReq.multi === undefined) {
                throw new Error('interval can only be used when multi=true.');
            } else if (interval[2] === 'h' && (interval[1] > 24 || interval[1] < 1)) {
                throw new Error('interval in hours (h) must be between 1 and 24.');
            } else if (interval[2] === 'm' && (interval[1] > 1440 || interval[1] < 1)) {
                throw new Error('interval in minutes (m) must be between 1 and 1440.');
            } else if (interval[2] === 's' && (interval[1] > 86400 || interval[1] < 1)) {
                throw new Error('interval in seconds (s) must be between 1 and 86400.');
            } else {
                return true;
            }
        }).customSanitizer((value) => {
            const interval = [...value.match(re)];
            interval[2] = interval[2].toLowerCase();
            return interval;
        }).optional(),
        check('w')
        .isInt().withMessage('w must be an integer between 1 and 4096.').bail()
        .custom((value, {
            req
        }) => {
            const newReq = req.method === "GET" ? req.query : req.body;
            if (value < 1 || value > 4096) {
                throw new Error('w must be an integer between 1 and 4096.');
            } else if (newReq.h === undefined){
                throw new Error('h is required when w is supplied.');
            } else {
                return true;
            }
        }).optional()
        .toInt(), 
        check('h')
        .isInt().withMessage('h must be an integer between 1 and 4096.').bail()
        .custom((value, {
            req
        }) => {
            const newReq = req.method === "GET" ? req.query : req.body;
            if (value < 1 || value > 4096) {
                throw new Error('h must be an integer between 1 and 4096.');
            } else if (newReq.w === undefined){
                throw new Error('w is required when w is supplied.');
            } else {
                return true;
            }
        }).optional()
        .toInt(), 
    ]
}

// multi, start_hour, end_hour, start_minute, end_minute, start_second, end_second, interval

const validate = (req, res, next) => {

    const errors = validationResult(req)
    if (errors.isEmpty()) {
        return next()
    }
    const extractedErrors = []
    errors.array().map(err => extractedErrors.push({
        [err.param]: err.msg
    }))
    const newReq = req.method === "GET" ? req.query : req.body;
    if (getBoolean(newReq.json)) {
        return res.status(422).json({
            errors: extractedErrors,
        })
    } else {
        return res.status(422).render("inputError", errors)
    }
}

function getBoolean(value) {
    switch (value) {
        case true:
        case "true":
        case 1:
        case "1":
        case "on":
        case "yes":
            return true;
        default:
            return false;
    }
}

function isValidDate(d, m, y) {
    // modified from https://stackoverflow.com/a/5812341/13902318
    var dt = new Date(y, m - 1, d);
    return dt && (dt.getMonth() + 1) == m;
  }

module.exports = {
    userValidationRules,
    validate,
    getBoolean
}