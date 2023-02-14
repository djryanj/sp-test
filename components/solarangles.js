'use strict';
// This implements a node.js version of the Solar Position Algorithm as described by
// https://www.nrel.gov/docs/fy08osti/34302.pdf
// const cheerio = require("cheerio");
// const axios = require("axios");
const vars = require("./vars");
// const tai = require("t-a-i");
// const NodeCache = require( "node-cache" );
// //const { delete } = require("../routes");
// const myCache = new NodeCache( { stdTTL: 86400 } );


// const fetchTerestrialTime = async () => {
//     const ttResult = await axios.get("https://data.iers.org/eris/eopOfToday/eopoftoday.php");
//     return cheerio.load(ttResult.data);
// };

// const solarConst = 1367; //watts per meter

// // need the day of year (i.e. 1-366)
// var now = new Date();
// var start = new Date(now.getFullYear(), 0, 0);
// var diff = (now - start) + ((start.getTimezoneOffset() - now.getTimezoneOffset()) * 60 * 1000);
// var oneDay = 1000 * 60 * 60 * 24;
// var day = Math.floor(diff / oneDay);
// console.log('Day of year: ' + day);

// const irradiance = solarConst * (1 + 0.034*Math.cos(2*Math.PI*(day / 265.25)));
// console.log('Irradiance: ' + irradiance);

// shortcuts for easier to read formulas - thanks to https://github.com/mourner/suncalc

const SUN_RADIUS = 0.26667;

var PI   = Math.PI,
    sin  = Math.sin,
    cos  = Math.cos,
    tan  = Math.tan,
    asin = Math.asin,
    atan = Math.atan,
    atan2 = Math.atan2,
    acos = Math.acos,
    rad  = PI / 180,
    deg  = 180 / PI,
    abs = Math.abs;

// in C this was pretty elegant but this is JavaScript so it's barf
const TERM_A = 0;
const TERM_X0 = 0;
const TERM_PSI_A = 0; 
const JD_MINUS = 0;
const SUN_TRANSIT = 0;
const TERM_B = 1;
const TERM_X1 = 1;
const TERM_PSI_B = 1;
const JD_ZERO = 1;
const SUN_RISE = 1;
const TERM_C = 2;
const TERM_X2 = 2;
const TERM_EPS_C = 2;
const JD_PLUS = 2;
const SUN_SET = 2;
const TERM_X3 = 3;
const TERM_EPS_D = 3;
const JD_COUNT = 3;
const SUN_COUNT = 3;
const TERM_X4 = 4;

// Earth periodic terms

const L_TERMS = 
[
    [
        [175347046.0,0,0],
        [3341656.0,4.6692568,6283.07585],
        [34894.0,4.6261,12566.1517],
        [3497.0,2.7441,5753.3849],
        [3418.0,2.8289,3.5231],
        [3136.0,3.6277,77713.7715],
        [2676.0,4.4181,7860.4194],
        [2343.0,6.1352,3930.2097],
        [1324.0,0.7425,11506.7698],
        [1273.0,2.0371,529.691],
        [1199.0,1.1096,1577.3435],
        [990,5.233,5884.927],
        [902,2.045,26.298],
        [857,3.508,398.149],
        [780,1.179,5223.694],
        [753,2.533,5507.553],
        [505,4.583,18849.228],
        [492,4.205,775.523],
        [357,2.92,0.067],
        [317,5.849,11790.629],
        [284,1.899,796.298],
        [271,0.315,10977.079],
        [243,0.345,5486.778],
        [206,4.806,2544.314],
        [205,1.869,5573.143],
        [202,2.458,6069.777],
        [156,0.833,213.299],
        [132,3.411,2942.463],
        [126,1.083,20.775],
        [115,0.645,0.98],
        [103,0.636,4694.003],
        [102,0.976,15720.839],
        [102,4.267,7.114],
        [99,6.21,2146.17],
        [98,0.68,155.42],
        [86,5.98,161000.69],
        [85,1.3,6275.96],
        [85,3.67,71430.7],
        [80,1.81,17260.15],
        [79,3.04,12036.46],
        [75,1.76,5088.63],
        [74,3.5,3154.69],
        [74,4.68,801.82],
        [70,0.83,9437.76],
        [62,3.98,8827.39],
        [61,1.82,7084.9],
        [57,2.78,6286.6],
        [56,4.39,14143.5],
        [56,3.47,6279.55],
        [52,0.19,12139.55],
        [52,1.33,1748.02],
        [51,0.28,5856.48],
        [49,0.49,1194.45],
        [41,5.37,8429.24],
        [41,2.4,19651.05],
        [39,6.17,10447.39],
        [37,6.04,10213.29],
        [37,2.57,1059.38],
        [36,1.71,2352.87],
        [36,1.78,6812.77],
        [33,0.59,17789.85],
        [30,0.44,83996.85],
        [30,2.74,1349.87],
        [25,3.16,4690.48]
    ],
    [
        [628331966747.0,0,0],
        [206059.0,2.678235,6283.07585],
        [4303.0,2.6351,12566.1517],
        [425.0,1.59,3.523],
        [119.0,5.796,26.298],
        [109.0,2.966,1577.344],
        [93,2.59,18849.23],
        [72,1.14,529.69],
        [68,1.87,398.15],
        [67,4.41,5507.55],
        [59,2.89,5223.69],
        [56,2.17,155.42],
        [45,0.4,796.3],
        [36,0.47,775.52],
        [29,2.65,7.11],
        [21,5.34,0.98],
        [19,1.85,5486.78],
        [19,4.97,213.3],
        [17,2.99,6275.96],
        [16,0.03,2544.31],
        [16,1.43,2146.17],
        [15,1.21,10977.08],
        [12,2.83,1748.02],
        [12,3.26,5088.63],
        [12,5.27,1194.45],
        [12,2.08,4694],
        [11,0.77,553.57],
        [10,1.3,6286.6],
        [10,4.24,1349.87],
        [9,2.7,242.73],
        [9,5.64,951.72],
        [8,5.3,2352.87],
        [6,2.65,9437.76],
        [6,4.67,4690.48]
    ],
    [
        [52919.0,0,0],
        [8720.0,1.0721,6283.0758],
        [309.0,0.867,12566.152],
        [27,0.05,3.52],
        [16,5.19,26.3],
        [16,3.68,155.42],
        [10,0.76,18849.23],
        [9,2.06,77713.77],
        [7,0.83,775.52],
        [5,4.66,1577.34],
        [4,1.03,7.11],
        [4,3.44,5573.14],
        [3,5.14,796.3],
        [3,6.05,5507.55],
        [3,1.19,242.73],
        [3,6.12,529.69],
        [3,0.31,398.15],
        [3,2.28,553.57],
        [2,4.38,5223.69],
        [2,3.75,0.98]
    ],
    [
        [289.0,5.844,6283.076],
        [35,0,0],
        [17,5.49,12566.15],
        [3,5.2,155.42],
        [1,4.72,3.52],
        [1,5.3,18849.23],
        [1,5.97,242.73]
    ],
    [
        [114.0,3.142,0],
        [8,4.13,6283.08],
        [1,3.84,12566.15]
    ],
    [
        [1,3.14,0]
    ]
]

const B_TERMS = 
[
    [
        [280.0,3.199,84334.662],
        [102.0,5.422,5507.553],
        [80,3.88,5223.69],
        [44,3.7,2352.87],
        [32,4,1577.34]
    ],
    [
        [9,3.9,5507.55],
        [6,1.73,5223.69]
    ]
];

const R_TERMS = 
[
    [
        [100013989.0,0,0],
        [1670700.0,3.0984635,6283.07585],
        [13956.0,3.05525,12566.1517],
        [3084.0,5.1985,77713.7715],
        [1628.0,1.1739,5753.3849],
        [1576.0,2.8469,7860.4194],
        [925.0,5.453,11506.77],
        [542.0,4.564,3930.21],
        [472.0,3.661,5884.927],
        [346.0,0.964,5507.553],
        [329.0,5.9,5223.694],
        [307.0,0.299,5573.143],
        [243.0,4.273,11790.629],
        [212.0,5.847,1577.344],
        [186.0,5.022,10977.079],
        [175.0,3.012,18849.228],
        [110.0,5.055,5486.778],
        [98,0.89,6069.78],
        [86,5.69,15720.84],
        [86,1.27,161000.69],
        [65,0.27,17260.15],
        [63,0.92,529.69],
        [57,2.01,83996.85],
        [56,5.24,71430.7],
        [49,3.25,2544.31],
        [47,2.58,775.52],
        [45,5.54,9437.76],
        [43,6.01,6275.96],
        [39,5.36,4694],
        [38,2.39,8827.39],
        [37,0.83,19651.05],
        [37,4.9,12139.55],
        [36,1.67,12036.46],
        [35,1.84,2942.46],
        [33,0.24,7084.9],
        [32,0.18,5088.63],
        [32,1.78,398.15],
        [28,1.21,6286.6],
        [28,1.9,6279.55],
        [26,4.59,10447.39]
    ],
    [
        [103019.0,1.10749,6283.07585],
        [1721.0,1.0644,12566.1517],
        [702.0,3.142,0],
        [32,1.02,18849.23],
        [31,2.84,5507.55],
        [25,1.32,5223.69],
        [18,1.42,1577.34],
        [10,5.91,10977.08],
        [9,1.42,6275.96],
        [9,0.27,5486.78]
    ],
    [
        [4359.0,5.7846,6283.0758],
        [124.0,5.579,12566.152],
        [12,3.14,0],
        [9,3.63,77713.77],
        [6,1.87,5573.14],
        [3,5.47,18849.23]
    ],
    [
        [145.0,4.273,6283.076],
        [7,3.92,12566.15]
    ],
    [
        [4,2.56,6283.08]
    ]
]

// periodic terms for the nutation in longitude and obliquity

const Y_TERMS = 
[
    [0,0,0,0,1],
    [-2,0,0,2,2],
    [0,0,0,2,2],
    [0,0,0,0,2],
    [0,1,0,0,0],
    [0,0,1,0,0],
    [-2,1,0,2,2],
    [0,0,0,2,1],
    [0,0,1,2,2],
    [-2,-1,0,2,2],
    [-2,0,1,0,0],
    [-2,0,0,2,1],
    [0,0,-1,2,2],
    [2,0,0,0,0],
    [0,0,1,0,1],
    [2,0,-1,2,2],
    [0,0,-1,0,1],
    [0,0,1,2,1],
    [-2,0,2,0,0],
    [0,0,-2,2,1],
    [2,0,0,2,2],
    [0,0,2,2,2],
    [0,0,2,0,0],
    [-2,0,1,2,2],
    [0,0,0,2,0],
    [-2,0,0,2,0],
    [0,0,-1,2,1],
    [0,2,0,0,0],
    [2,0,-1,0,1],
    [-2,2,0,2,2],
    [0,1,0,0,1],
    [-2,0,1,0,1],
    [0,-1,0,0,1],
    [0,0,2,-2,0],
    [2,0,-1,2,1],
    [2,0,1,2,2],
    [0,1,0,2,2],
    [-2,1,1,0,0],
    [0,-1,0,2,2],
    [2,0,0,2,1],
    [2,0,1,0,0],
    [-2,0,2,2,2],
    [-2,0,1,2,1],
    [2,0,-2,0,1],
    [2,0,0,0,1],
    [0,-1,1,0,0],
    [-2,-1,0,2,1],
    [-2,0,0,0,1],
    [0,0,2,2,1],
    [-2,0,2,0,1],
    [-2,1,0,2,1],
    [0,0,1,-2,0],
    [-1,0,1,0,0],
    [-2,1,0,0,0],
    [1,0,0,0,0],
    [0,0,1,2,0],
    [0,0,-2,2,2],
    [-1,-1,1,0,0],
    [0,1,1,0,0],
    [0,-1,1,2,2],
    [2,-1,-1,2,2],
    [0,0,3,2,2],
    [2,-1,0,2,2],
]

const PE_TERMS = 
[
    [-171996,-174.2,92025,8.9],
    [-13187,-1.6,5736,-3.1],
    [-2274,-0.2,977,-0.5],
    [2062,0.2,-895,0.5],
    [1426,-3.4,54,-0.1],
    [712,0.1,-7,0],
    [-517,1.2,224,-0.6],
    [-386,-0.4,200,0],
    [-301,0,129,-0.1],
    [217,-0.5,-95,0.3],
    [-158,0,0,0],
    [129,0.1,-70,0],
    [123,0,-53,0],
    [63,0,0,0],
    [63,0.1,-33,0],
    [-59,0,26,0],
    [-58,-0.1,32,0],
    [-51,0,27,0],
    [48,0,0,0],
    [46,0,-24,0],
    [-38,0,16,0],
    [-31,0,13,0],
    [29,0,0,0],
    [29,0,-12,0],
    [26,0,0,0],
    [-22,0,0,0],
    [21,0,-10,0],
    [17,-0.1,0,0],
    [16,0,-8,0],
    [-16,0.1,7,0],
    [-15,0,9,0],
    [-13,0,7,0],
    [-12,0,6,0],
    [11,0,0,0],
    [-10,0,5,0],
    [-8,0,3,0],
    [7,0,-3,0],
    [-7,0,0,0],
    [-7,0,3,0],
    [-7,0,3,0],
    [6,0,0,0],
    [6,0,-3,0],
    [6,0,-3,0],
    [-6,0,3,0],
    [-6,0,3,0],
    [5,0,0,0],
    [-5,0,3,0],
    [-5,0,3,0],
    [-5,0,3,0],
    [4,0,0,0],
    [4,0,0,0],
    [4,0,0,0],
    [-4,0,0,0],
    [-4,0,0,0],
    [-4,0,0,0],
    [3,0,0,0],
    [-3,0,0,0],
    [-3,0,0,0],
    [-3,0,0,0],
    [-3,0,0,0],
    [-3,0,0,0],
    [-3,0,0,0],
    [-3,0,0,0],
];


// helper functions

function limit_degrees(degrees)
{
    degrees /= 360.0;
    var limited = 360.0*(degrees - Math.floor(degrees));
    if (limited < 0) limited += 360.0;

    return limited;
}

function limit_degrees180pm(degrees)
{
    degrees /= 360.0;
    var limited = 360.0*(degrees - Math.floor(degrees));
    if      (limited < -180.0) limited += 360.0;
    else if (limited >  180.0) limited -= 360.0;

    return limited;
}

function limit_degrees180(degrees)
{
    degrees /= 180.0;
    var limited = 180.0*(degrees - Math.floor(degrees));
    if (limited < 0) limited += 180.0;

    return limited;
}

function limit_zero2one(value)
{
    var limited = value - Math.floor(value);
    if (limited < 0) limited += 1.0;

    return limited;
}

function limit_minutes(minutes)
{
    var limited = minutes;

    if      (limited < -20.0) limited += 1440.0;
    else if (limited >  20.0) limited -= 1440.0;

    return limited;
}

function dayfrac_to_local_hr(dayfrac, timezone)
{
    return 24.0 * limit_zero2one(dayfrac + timezone/24.0);
}

function third_order_polynomial(a, b, c, d, x)
{
    return ((a*x + b)*x + c)*x + d;
}

///////////////////////////////////////////////////////////////////////////////////////////////
// function validate_inputs(spa)
// { 
//     if ((spa.year        < -2000) || (spa.year        > 6000)) return 1;
//     if ((spa.month       < 1    ) || (spa.month       > 12  )) return 2;
//     if ((spa.day         < 1    ) || (spa.day         > 31  )) return 3;
//     if ((spa.hour        < 0    ) || (spa.hour        > 24  )) return 4;
//     if ((spa.minute      < 0    ) || (spa.minute      > 59  )) return 5;
//     if ((spa.second      < 0    ) || (spa.second      >=60  )) return 6;
//     if ((spa.avg_pressure    < 0    ) || (spa.avg_pressure    > 5000)) return 12;
//     if ((spa.avg_temperature <= -273) || (spa.avg_temperature > 6000)) return 13;
//     if ((spa.delta_ut1   <= -1  ) || (spa.delta_ut1   >= 1  )) return 17;
// 	if ((spa.hour        == 24  ) && (spa.minute      > 0   )) return 5;
//     if ((spa.hour        == 24  ) && (spa.second      > 0   )) return 6;

//     if (abs(spa.delta_t)       > 8000    ) return 7;
//     if (abs(spa.timezone)      > 18      ) return 8;
//     if (abs(spa.longitude)     > 180     ) return 9;
//     if (abs(spa.latitude)      > 90      ) return 10;
//     if (abs(spa.atmos_refract) > 5       ) return 16;
//     if (     spa.elevation      < -6500000) return 11;

//     if ((spa.function == vars.SPA_ZA_INC) || (spa.function == vars.SPA_ALL))
//     {
//         if (abs(spa.slope)         > 360) return 14;
//         if (abs(spa.azm_rotation)  > 360) return 15;
//     }

//     return 0;
// }

// date calculation functions
function julian_day(year, month, day, hour, minute, second, dut1, tz) {
    
    var day_decimal = day + (hour - tz + (minute + (second + dut1)/60.0)/60.0)/24.0;

    if (month < 3) {
        month += 12;
        year--;
    }

    var jd = parseInt(365.25*(year+4716.0)) + parseInt(30.6001*(month+1)) + day_decimal - 1524.5;

    if (jd > 2299160.0) {
        var a = parseInt(year/100);
        jd += (2 - a + parseInt(a/4));
    }
    return jd;
}

function julian_century(jd) {
    return (jd-2451545.0)/36525.0;
}

function julian_ephemeris_day(jd, delta_t)
{
    return jd+delta_t/86400.0;
}

function julian_ephemeris_century(jde)
{
    return (jde - 2451545.0)/36525.0;
}

function julian_ephemeris_millennium(jce)
{
    return (jce/10.0);
}

function earth_periodic_term_summation(terms, count, jme)
{
    var i;
    var sum = 0;
    for (i = 0; i < count; i++) {
        sum += terms[i][TERM_A]*cos(terms[i][TERM_B]+terms[i][TERM_C]*jme);
    }
    return sum;
}

function earth_values(term_sum, count, jme)
{
    var i;
    var sum = 0;
    for (i = 0; i < count; i++) {
        sum += term_sum[i]*Math.pow(jme, i);
    }
    sum /= 1.0e8;
    return sum;
}

function earth_heliocentric_longitude(jme)
{
    var i;
    var sum = [];
    for (i = 0; i < L_TERMS.length; i++) {
        sum[i] = earth_periodic_term_summation(L_TERMS[i], L_TERMS[i].length, jme);
    }
    return limit_degrees(deg * earth_values(sum, L_TERMS.length, jme));
}

function earth_heliocentric_latitude(jme)
{
    var i;
    var sum = []
    for (i = 0; i < B_TERMS.length; i++)
        sum[i] = earth_periodic_term_summation(B_TERMS[i], B_TERMS[i].length, jme);

    return deg * earth_values(sum, B_TERMS.length, jme);
}

function earth_radius_vector(jme)
{
    var i;
    var sum = []
    for (i = 0; i < R_TERMS.length; i++)
        sum.push(earth_periodic_term_summation(R_TERMS[i], R_TERMS[i].length, jme));

    return earth_values(sum, R_TERMS.length, jme);
}

function geocentric_longitude(l)
{
    var theta = l + 180.0;

    if (theta >= 360.0) theta -= 360.0;

    return theta;
}

function geocentric_latitude(b)
{
    return -b;
}

function mean_elongation_moon_sun(jce)
{
    return third_order_polynomial(1.0/189474.0, -0.0019142, 445267.11148, 297.85036, jce);
}

function mean_anomaly_sun(jce)
{
    return third_order_polynomial(-1.0/300000.0, -0.0001603, 35999.05034, 357.52772, jce);
}

function mean_anomaly_moon(jce)
{
    return third_order_polynomial(1.0/56250.0, 0.0086972, 477198.867398, 134.96298, jce);
}

function argument_latitude_moon(jce)
{
    return third_order_polynomial(1.0/327270.0, -0.0036825, 483202.017538, 93.27191, jce);
}

function ascending_longitude_moon(jce)
{
    return third_order_polynomial(1.0/450000.0, 0.0020708, -1934.136261, 125.04452, jce);
}

function xy_term_summation(i, x)
{
    var j;
    var sum = 0;
    // original code uses j < TERM_Y_COUNT, but TERM_Y_COUNT is based on a weird intrinsic ENUM declaration in C
    // it works because of the structure of the enum but is incredibly hard to read so I just grab the length
    // of the first element in the Y_TERMS array instead
    for (j = 0; j < Y_TERMS[0].length; j++)
        sum += x[j]*Y_TERMS[i][j];

    return sum;
}

function nutation_longitude_and_obliquity(jce, x) 
{
    var i;
    var sum_psi=0
    var sum_epsilon=0;

    for (i = 0; i < Y_TERMS.length; i++) {
        var xy_term_sum  = rad * xy_term_summation(i, x);
        sum_psi     += (PE_TERMS[i][TERM_PSI_A] + jce*PE_TERMS[i][TERM_PSI_B])*sin(xy_term_sum);
        sum_epsilon += (PE_TERMS[i][TERM_EPS_C] + jce*PE_TERMS[i][TERM_EPS_D])*cos(xy_term_sum);
    }

    return {
        del_psi : (sum_psi / 36000000.0),
        del_epsilon : (sum_epsilon / 36000000.0),
    };
}

function ecliptic_mean_obliquity(jme)
{
    var u = jme/10.0;

    return 84381.448 + u*(-4680.93 + u*(-1.55 + u*(1999.25 + u*(-51.38 + u*(-249.67 +
                       u*(  -39.05 + u*( 7.12 + u*(  27.87 + u*(  5.79 + u*2.45)))))))));
}

function ecliptic_true_obliquity(delta_epsilon, epsilon0)
{
    return delta_epsilon + epsilon0/3600.0;
}

function aberration_correction(r)
{
    return -20.4898 / (3600.0*r);
}

function apparent_sun_longitude(theta, delta_psi, delta_tau)
{
    return theta + delta_psi + delta_tau;
}

function greenwich_mean_sidereal_time (jd, jc)
{
    return limit_degrees(280.46061837 + 360.98564736629 * (jd - 2451545.0) +
                                       jc*jc*(0.000387933 - jc/38710000.0));
}

function greenwich_sidereal_time (nu0, delta_psi, epsilon)
{
    return nu0 + delta_psi*cos(rad * epsilon);
}

function geocentric_right_ascension(lamda, epsilon, beta)
{
    var lamda_rad   = rad*lamda;
    var epsilon_rad = rad*epsilon;
    var beta_rad = rad*beta;

    return limit_degrees(deg * (atan2(sin(lamda_rad)*cos(epsilon_rad) -
                                       tan(beta_rad)*sin(epsilon_rad), cos(lamda_rad))));
}

function geocentric_declination(beta, epsilon, lamda)
{
    var beta_rad    = rad * beta;
    var epsilon_rad = rad * epsilon;
    var lamda_rad = rad * lamda;

    return deg * (asin(sin(beta_rad)*cos(epsilon_rad) +
                        cos(beta_rad)*sin(epsilon_rad)*sin(lamda_rad)));
}

function observer_hour_angle(nu, longitude, alpha_deg)
{
    return limit_degrees(nu + longitude - alpha_deg);
}

function sun_equatorial_horizontal_parallax(r)
{
    return 8.794 / (3600.0 * r);
}

function right_ascension_parallax_and_topocentric_dec(latitude, elevation, xi, h, delta)
{
    var lat_rad   = rad * latitude;
    var xi_rad    = rad * xi;
    var h_rad     = rad * h;
    var delta_rad = rad * delta;
    var u = atan(0.99664719 * tan(lat_rad));
    var y = 0.99664719 * sin(u) + elevation*sin(lat_rad)/6378140.0;
    var x =              cos(u) + elevation*cos(lat_rad)/6378140.0;

    var delta_alpha_rad =      atan2(                - x*sin(xi_rad) *sin(h_rad),
                            cos(delta_rad) - x*sin(xi_rad) *cos(h_rad));

    var delta_prime = deg * (atan2((sin(delta_rad) - y*sin(xi_rad))*cos(delta_alpha_rad),
                            cos(delta_rad) - x*sin(xi_rad) *cos(h_rad)));

    var delta_alpha = deg * delta_alpha_rad;

    return {
        delta_prime : delta_prime,
        delta_alpha : delta_alpha,
    }
}

function topocentric_right_ascension(alpha_deg, delta_alpha)
{
    return alpha_deg + delta_alpha;
}

function topocentric_local_hour_angle(h, delta_alpha)
{
    return h - delta_alpha;
}

function topocentric_elevation_angle(latitude, delta_prime, h_prime)
{
    var lat_rad         = rad * latitude;
    var delta_prime_rad = rad * delta_prime;
    var h_prime_rad = rad * h_prime

    return deg*(asin(sin(lat_rad)*sin(delta_prime_rad) +
                        cos(lat_rad)*cos(delta_prime_rad) * cos(h_prime_rad)));
}

function atmospheric_refraction_correction(avg_pressure, avg_temperature, atmos_refract, e0)
{
    var del_e = 0;

    if (e0 >= -1*(SUN_RADIUS + atmos_refract))
        del_e = (avg_pressure / 1010.0) * (283.0 / (273.0 + avg_temperature)) *
                1.02 / (60.0 * tan(rad*(e0 + 10.3/(e0 + 5.11))));

    return del_e;
}

function topocentric_elevation_angle_corrected(e0, delta_e)
{
    return e0 + delta_e;
}

function topocentric_zenith_angle(e)
{
    return 90.0 - e;
}

function topocentric_azimuth_angle_astro(h_prime, latitude, delta_prime)
{
    var h_prime_rad = rad * h_prime;
    var lat_rad     = rad * latitude;
    var delta_prime_rad = rad * delta_prime;

    return limit_degrees(deg*(atan2(sin(h_prime_rad),
                         cos(h_prime_rad)*sin(lat_rad) - tan(delta_prime_rad)*cos(lat_rad))));
}

function topocentric_azimuth_angle(azimuth_astro)
{
    return limit_degrees(azimuth_astro + 180.0);
}

function surface_incidence_angle(zenith, azimuth_astro, azm_rotation, slope)
{
    var zenith_rad = rad * zenith;
    var slope_rad  = rad * slope;

    return deg * (acos(cos(zenith_rad)*cos(slope_rad)  +
        sin(slope_rad )*sin(zenith_rad) * cos(rad * (azimuth_astro - azm_rotation))));
}

function sun_mean_longitude(jme)
{
    return limit_degrees(280.4664567 + jme*(360007.6982779 + jme*(0.03032028 +
                    jme*(1/49931.0   + jme*(-1/15300.0     + jme*(-1/2000000.0))))));
}

function eot(m, alpha, del_psi, epsilon)
{
    return limit_minutes(4.0*(m - 0.0057183 - alpha + del_psi*cos(rad * epsilon)));
}

function approx_sun_transit_time(alpha_zero, longitude, nu)
{
    return (alpha_zero - longitude - nu) / 360.0;
}

function sun_hour_angle_at_rise_set(latitude, delta_zero, h0_prime)
{
    var h0             = -99999;
    var latitude_rad   = rad * latitude;
    var delta_zero_rad = rad * delta_zero;
    var argument       = (sin(rad * h0_prime) - sin(latitude_rad)*sin(delta_zero_rad)) /
                                                     (cos(latitude_rad)*cos(delta_zero_rad));

    if (abs(argument) <= 1) h0 = limit_degrees180(deg * (acos(argument)));

    return h0;
}

function approx_sun_rise_and_set(m_rts, h0)
{
    var h0_dfrac = h0/360.0;

    m_rts[SUN_RISE]    = limit_zero2one(m_rts[SUN_TRANSIT] - h0_dfrac);
    m_rts[SUN_SET]     = limit_zero2one(m_rts[SUN_TRANSIT] + h0_dfrac);
    m_rts[SUN_TRANSIT] = limit_zero2one(m_rts[SUN_TRANSIT]);
}

function rts_alpha_delta_prime(ad, n)
{
    var a = ad[JD_ZERO] - ad[JD_MINUS];
    var b = ad[JD_PLUS] - ad[JD_ZERO];

    if (abs(a) >= 2.0) a = limit_zero2one(a);
    if (abs(b) >= 2.0) b = limit_zero2one(b);

    return ad[JD_ZERO] + n * (a + b + (b-a)*n)/2.0;
}

function rts_sun_altitude(latitude, delta_prime, h_prime)
{
    var latitude_rad    = rad * latitude;
    var delta_prime_rad = rad * delta_prime;
    var h_prime_rad = rad * h_prime;

    return deg * (asin(sin(latitude_rad)*sin(delta_prime_rad) +
                        cos(latitude_rad)*cos(delta_prime_rad)*cos(h_prime_rad)));
}

function sun_rise_and_set(m_rts, h_rts, delta_prime, latitude, h_prime, h0_prime, sun)
{
    var toreturn = m_rts[sun] + (h_rts[sun] - h0_prime) /
        (360.0*cos(rad * (delta_prime[sun]))*cos(rad * (latitude))*sin(rad * (h_prime[sun])));
    return toreturn;
}

////////////////////////////////////////////////////////////////////////////////////////////////
// Calculate required SPA parameters to get the right ascension (alpha) and declination (delta)
// Note: JD must be already calculated 
////////////////////////////////////////////////////////////////////////////////////////////////
function calculate_geocentric_sun_right_ascension_and_declination(spa)
{
    spa.jc = julian_century(spa.jd);

    spa.jde = julian_ephemeris_day(spa.jd, spa.delta_t);
    spa.jce = julian_ephemeris_century(spa.jde);
    spa.jme = julian_ephemeris_millennium(spa.jce);

    spa.l = earth_heliocentric_longitude(spa.jme);
    spa.b = earth_heliocentric_latitude(spa.jme);
    spa.r = earth_radius_vector(spa.jme);

    spa.theta = geocentric_longitude(spa.l);
    spa.beta  = geocentric_latitude(spa.b);
    spa.x0 = mean_elongation_moon_sun(spa.jce);
    spa.x1 = mean_anomaly_sun(spa.jce);
    spa.x2 = mean_anomaly_moon(spa.jce);
    spa.x3 = argument_latitude_moon(spa.jce);
    spa.x4 = ascending_longitude_moon(spa.jce);
    var x = [];
    x[TERM_X0] = spa.x0;
    x[TERM_X1] = spa.x1;
    x[TERM_X2] = spa.x2;  
    x[TERM_X3] = spa.x3;
    x[TERM_X4] = spa.x4;   

    const nutation = nutation_longitude_and_obliquity(spa.jce, x);
    spa.del_psi = nutation.del_psi;
    spa.del_epsilon = nutation.del_epsilon;

    spa.epsilon0 = ecliptic_mean_obliquity(spa.jme);
    spa.epsilon  = ecliptic_true_obliquity(spa.del_epsilon, spa.epsilon0);

    spa.del_tau   = aberration_correction(spa.r);
    spa.lamda     = apparent_sun_longitude(spa.theta, spa.del_psi, spa.del_tau);
    spa.nu0       = greenwich_mean_sidereal_time (spa.jd, spa.jc);
    spa.nu        = greenwich_sidereal_time (spa.nu0, spa.del_psi, spa.epsilon);

    spa.alpha = geocentric_right_ascension(spa.lamda, spa.epsilon, spa.beta);
    spa.delta = geocentric_declination(spa.beta, spa.epsilon, spa.lamda);
}

////////////////////////////////////////////////////////////////////////
// Calculate Equation of Time (EOT) and Sun Rise, Transit, & Set (RTS)
////////////////////////////////////////////////////////////////////////

function calculate_eot_and_sun_rise_transit_set(spa)
{
    var sun_rts = {...spa};
    var nu, m, h0, n;
    var alpha = [], delta = [];
    var m_rts = [], nu_rts = [], h_rts = [];
    var alpha_prime = [], delta_prime = [], h_prime = [];
    var h0_prime = -1*(SUN_RADIUS + spa.atmos_refract);

    m        = sun_mean_longitude(spa.jme);
    spa.eot = eot(m, spa.alpha, spa.del_psi, spa.epsilon);

    sun_rts.hour = sun_rts.minute = sun_rts.second = 0;
	sun_rts.delta_ut1 = sun_rts.timezone = 0.0;

    sun_rts.jd = julian_day(sun_rts.year,   sun_rts.month,  sun_rts.day,       sun_rts.hour,
		                     sun_rts.minute, sun_rts.second, sun_rts.delta_ut1, sun_rts.timezone);

    calculate_geocentric_sun_right_ascension_and_declination(sun_rts);
    nu = sun_rts.nu;

    sun_rts.delta_t = 0;
    sun_rts.jd--;
    var i;
    for (i = 0; i < JD_COUNT; i++) {
        calculate_geocentric_sun_right_ascension_and_declination(sun_rts);
        alpha[i] = sun_rts.alpha;
        delta[i] = sun_rts.delta;
        sun_rts.jd++;
    }

    m_rts[SUN_TRANSIT] = approx_sun_transit_time(alpha[JD_ZERO], spa.longitude, nu);
    h0 = sun_hour_angle_at_rise_set(spa.latitude, delta[JD_ZERO], h0_prime);

    if (h0 >= 0) {

        approx_sun_rise_and_set(m_rts, h0);
        var i;
        for (i = 0; i < SUN_COUNT; i++) {

            nu_rts[i] = nu + 360.985647*m_rts[i];

            n              = m_rts[i] + spa.delta_t/86400.0;
            alpha_prime[i] = rts_alpha_delta_prime(alpha, n);
            delta_prime[i] = rts_alpha_delta_prime(delta, n);

            h_prime[i] = limit_degrees180pm(nu_rts[i] + spa.longitude - alpha_prime[i]);
            h_rts[i] = rts_sun_altitude(spa.latitude, delta_prime[i], h_prime[i]);
        }

        spa.srha = h_prime[SUN_RISE];
        spa.ssha = h_prime[SUN_SET];
        spa.sta  = h_rts[SUN_TRANSIT];

        spa.suntransit = dayfrac_to_local_hr(m_rts[SUN_TRANSIT] - h_prime[SUN_TRANSIT] / 360.0,
                                              spa.timezone);

        spa.sunrise = dayfrac_to_local_hr(sun_rise_and_set(m_rts, h_rts, delta_prime,
                          spa.latitude, h_prime, h0_prime, SUN_RISE), spa.timezone);

        spa.sunset  = dayfrac_to_local_hr(sun_rise_and_set(m_rts, h_rts, delta_prime,
                          spa.latitude, h_prime, h0_prime, SUN_SET),  spa.timezone);

    } else spa.srha = spa.ssha = spa.sta = spa.suntransit = spa.sunrise = spa.sunset = -99999;
}

///////////////////////////////////////////////////////////////////////////////////////////
// Calculate all SPA parameters and put into structure
// Note: All inputs values (listed in header file) must already be in structure
///////////////////////////////////////////////////////////////////////////////////////////
function spa_calculate(spa)
{
    // const result = validate_inputs(spa);

    // if (result == 0) // minimum data input is valid
    // {
        spa.jd = julian_day (spa.year,   spa.month,  spa.day,       spa.hour,
			                  spa.minute, spa.second, spa.delta_ut1, spa.timezone);
        
    
        //console.log(spa);
        calculate_geocentric_sun_right_ascension_and_declination(spa);
        
        //console.log(spa);
        spa.h  = observer_hour_angle(spa.nu, spa.longitude, spa.alpha);
        spa.xi = sun_equatorial_horizontal_parallax(spa.r);

        const rapatd = right_ascension_parallax_and_topocentric_dec(spa.latitude, spa.elevation, spa.xi, spa.h, spa.delta);
        spa.del_alpha = rapatd.delta_alpha;
        spa.delta_prime = rapatd.delta_prime;

        spa.alpha_prime = topocentric_right_ascension(spa.alpha, spa.del_alpha);
        spa.h_prime     = topocentric_local_hour_angle(spa.h, spa.del_alpha);

        spa.e0      = topocentric_elevation_angle(spa.latitude, spa.delta_prime, spa.h_prime);
        spa.del_e   = atmospheric_refraction_correction(spa.avg_pressure, spa.avg_temperature, spa.atmos_refract, spa.e0);
        spa.e       = topocentric_elevation_angle_corrected(spa.e0, spa.del_e);

        spa.zenith        = topocentric_zenith_angle(spa.e);
        spa.azimuth_astro = topocentric_azimuth_angle_astro(spa.h_prime, spa.latitude, spa.delta_prime);
        spa.azimuth       = topocentric_azimuth_angle(spa.azimuth_astro);

        if ((spa.function == vars.SPA_ZA_INC) || (spa.function == vars.SPA_ALL))
            spa.incidence  = surface_incidence_angle(spa.zenith, spa.azimuth_astro,
                                                      spa.azm_rotation, spa.slope);

        if ((spa.function == vars.SPA_ZA_RTS) || (spa.function == vars.SPA_ALL))
            calculate_eot_and_sun_rise_transit_set(spa);
    // }

    return {
        // result: result,
        spa: spa,
    }
}

const getAngles = async(year, month, day, hour, minute, second, tz, latitude, longitude, elevation, avg_pressure, avg_temperature, slope, azm_rotation, atmos_refract, func, delta_ut1, delta_t) => {
    // var rightNow = new Date();
    
    
    // // Since DUT1 is yanked from the web and technically speaking it's not an API service but a scrape from IERS,
    // // cache the value for a day and only scrape the web site when it expires. Realistically it could be 
    // // cached longer than that as DUT1 isn't updated very often. It's also arguably moot, but the calculations
    // // call for it in the SPA so why not.

    // // get DUT1 from the cache
    // //var delta_ut1 = myCache.get("dut1");
    // var delta_ut1 = -0.19553;
    // // wasn't in the cache, get it from the web
    // if (delta_ut1 === undefined) {
    //     console.log("dut1 cache miss");
    //     const $tt = await fetchTerestrialTime();
    //     delta_ut1 = parseFloat($tt('table tbody tr:nth-child(3) td:nth-child(2)').text())/1000;
    //     cached = myCache.set("dut1", delta_ut1, 86400);
    //     console.log("dut1 Cached value: " + delta_ut1);
    // } else {
    //     console.log("dut1 was in cache, using value: " + delta_ut1);
    // }

    const spa_test = {};
    
    // // note that the t-a-i package doesn't really do anything special for TAI values after 1961 and under the
    // // hood really is just returning a hard-coded value for this; I could hard code the value too but
    // // the hope is that if/when TAI gets updated again, the package will also update and this will continue
    // // to be correct with little more than a rebuild of the app. 
    // var offset = (tai.unixToAtomic(rightNow.getTime()) - rightNow.getTime())/1000;
    // var delta_t = (32.184 + offset) - delta_ut1;
    // console.log("TAI offset: " + offset + "; delta T: " + delta_t + "; DUT1: " + delta_ut1 + "; func: " + func); 

    spa_test.year          = year;
    spa_test.month         = month
    spa_test.day           = day;
    spa_test.hour          = hour;
    spa_test.minute        = minute;
    spa_test.second        = second;
    spa_test.timezone      = tz;
    spa_test.delta_ut1     = delta_ut1;
    spa_test.delta_t       = delta_t;
    spa_test.longitude     = longitude;
    spa_test.latitude      = latitude;
    spa_test.elevation     = elevation;
    spa_test.avg_pressure  = avg_pressure;
    spa_test.avg_temperature      = avg_temperature;
    spa_test.slope         = slope;
    spa_test.azm_rotation  = azm_rotation;
    spa_test.atmos_refract = atmos_refract;
    spa_test.function      = func;

    const result = spa_calculate(spa_test);
    //console.log(result)
    delete result.spa.year;
    delete result.spa.month;
    delete result.spa.day;
    delete result.spa.timezone;
    delete result.spa.longitude;
    delete result.spa.latitude;
    delete result.spa.elevation;
    delete result.spa.avg_pressure;
    delete result.spa.avg_temperature;
    delete result.spa.slope;
    delete result.spa.azm_rotaton;
    delete result.spa.atmos_refract;
    delete result.spa.function;
    // delete result.spa.delta_ut1;
    // delete result.spa.delta_t;
    //console.log(result)

    // if (result.result === 0) {
        // console.log("Julian Day:",spa_test.jd);
        // console.log("L:",spa_test.l);
        // console.log("B:",spa_test.b);
        // console.log("R:",spa_test.r);
        // console.log("H:",spa_test.h);
        // console.log("Delta Psi:",spa_test.del_psi);
        // console.log("Delta Epsilon:",spa_test.del_epsilon);
        // console.log("Epsilon:",spa_test.epsilon);
        // console.log("Zenith:",spa_test.zenith);
        // console.log("Azimuth:",spa_test.azimuth);
        // console.log("Incidence:",spa_test.incidence);

        let mins = 60.0 * (result.spa.sunrise - parseInt(result.spa.sunrise));
        let secs = 60.0 * (mins - parseInt(mins));
        result.spa.sunrise_hr = parseInt(result.spa.sunrise).toString().padStart(2, "0") + ":" + parseInt(mins).toString().padStart(2, "0") + ":" + parseInt(secs).toString().padStart(2, "0");

        // console.log("Sunrise: " + parseInt(spa_test.sunrise) + ":" + parseInt(mins) + ":" + parseInt(secs));

        mins = 60.0 * (result.spa.sunset - parseInt(result.spa.sunset));
        secs = 60.0 * (mins - parseInt(mins));

        result.spa.sunset_hr = parseInt(result.spa.sunset).toString().padStart(2, "0") + ":" + parseInt(mins).toString().padStart(2, "0") + ":" + parseInt(secs).toString().padStart(2, "0");

        mins = 60.0 * (result.spa.suntransit - parseInt(result.spa.suntransit));
        secs = 60.0 * (mins - parseInt(mins));

        result.spa.suntransit_hr = parseInt(result.spa.suntransit).toString().padStart(2, "0") + ":" + parseInt(mins).toString().padStart(2, "0") + ":" + parseInt(secs).toString().padStart(2, "0");

        // console.log("Sunset: " + parseInt(spa_test.sunset) + ":" + parseInt(mins) + ":" + parseInt(secs));
        // spa_test.result = result.result;
        
        return result.spa;
    // } else {
    //     console.log("ERROR: result: " + result.result); 
    //     spa_test.result = result.result;
    //     return spa_test;
    // }
}

module.exports = getAngles;