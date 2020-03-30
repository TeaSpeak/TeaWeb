interface CountryInfo {
    name: string;
    alpha_2: string;
    alpha_3: string;
    un_code: number;
}
const country_infos: CountryInfo[] = [];
const alpha_2_map: {[name: string]:CountryInfo} = {};

const fill_country_infos = (array: CountryInfo[]) => {
    array.push({
        name: "Afghanistan",
        alpha_2: "AF",
        alpha_3: "AFG",
        un_code: 4
    });
    array.push({
        name: "Aland Islands",
        alpha_2: "AX",
        alpha_3: "ALA",
        un_code: 248
    });
    array.push({
        name: "Albania",
        alpha_2: "AL",
        alpha_3: "ALB",
        un_code: 8
    });
    array.push({
        name: "Algeria",
        alpha_2: "DZ",
        alpha_3: "DZA",
        un_code: 12
    });
    array.push({
        name: "American Samoa",
        alpha_2: "AS",
        alpha_3: "ASM",
        un_code: 16
    });
    array.push({
        name: "Andorra",
        alpha_2: "AD",
        alpha_3: "AND",
        un_code: 20
    });
    array.push({
        name: "Angola",
        alpha_2: "AO",
        alpha_3: "AGO",
        un_code: 24
    });
    array.push({
        name: "Anguilla",
        alpha_2: "AI",
        alpha_3: "AIA",
        un_code: 660
    });
    array.push({
        name: "Antarctica",
        alpha_2: "AQ",
        alpha_3: "ATA",
        un_code: 10
    });
    array.push({
        name: "Antigua and Barbuda",
        alpha_2: "AG",
        alpha_3: "ATG",
        un_code: 28
    });
    array.push({
        name: "Argentina",
        alpha_2: "AR",
        alpha_3: "ARG",
        un_code: 32
    });
    array.push({
        name: "Armenia",
        alpha_2: "AM",
        alpha_3: "ARM",
        un_code: 51
    });
    array.push({
        name: "Aruba",
        alpha_2: "AW",
        alpha_3: "ABW",
        un_code: 533
    });
    array.push({
        name: "Australia",
        alpha_2: "AU",
        alpha_3: "AUS",
        un_code: 36
    });
    array.push({
        name: "Austria",
        alpha_2: "AT",
        alpha_3: "AUT",
        un_code: 40
    });
    array.push({
        name: "Azerbaijan",
        alpha_2: "AZ",
        alpha_3: "AZE",
        un_code: 31
    });
    array.push({
        name: "Bahamas",
        alpha_2: "BS",
        alpha_3: "BHS",
        un_code: 44
    });
    array.push({
        name: "Bahrain",
        alpha_2: "BH",
        alpha_3: "BHR",
        un_code: 48
    });
    array.push({
        name: "Bangladesh",
        alpha_2: "BD",
        alpha_3: "BGD",
        un_code: 50
    });
    array.push({
        name: "Barbados",
        alpha_2: "BB",
        alpha_3: "BRB",
        un_code: 52
    });
    array.push({
        name: "Belarus",
        alpha_2: "BY",
        alpha_3: "BLR",
        un_code: 112
    });
    array.push({
        name: "Belgium",
        alpha_2: "BE",
        alpha_3: "BEL",
        un_code: 56
    });
    array.push({
        name: "Belize",
        alpha_2: "BZ",
        alpha_3: "BLZ",
        un_code: 84
    });
    array.push({
        name: "Benin",
        alpha_2: "BJ",
        alpha_3: "BEN",
        un_code: 204
    });
    array.push({
        name: "Bermuda",
        alpha_2: "BM",
        alpha_3: "BMU",
        un_code: 60
    });
    array.push({
        name: "Bhutan",
        alpha_2: "BT",
        alpha_3: "BTN",
        un_code: 64
    });
    array.push({
        name: "Bolivia",
        alpha_2: "BO",
        alpha_3: "BOL",
        un_code: 68
    });
    array.push({
        name: "Bosnia and Herzegovina",
        alpha_2: "BA",
        alpha_3: "BIH",
        un_code: 70
    });
    array.push({
        name: "Botswana",
        alpha_2: "BW",
        alpha_3: "BWA",
        un_code: 72
    });
    array.push({
        name: "Bouvet Island",
        alpha_2: "BV",
        alpha_3: "BVT",
        un_code: 74
    });
    array.push({
        name: "Brazil",
        alpha_2: "BR",
        alpha_3: "BRA",
        un_code: 76
    });
    array.push({
        name: "British Virgin Islands",
        alpha_2: "VG",
        alpha_3: "VGB",
        un_code: 92
    });
    array.push({
        name: "British Indian Ocean Territory",
        alpha_2: "IO",
        alpha_3: "IOT",
        un_code: 86
    });
    array.push({
        name: "Brunei Darussalam",
        alpha_2: "BN",
        alpha_3: "BRN",
        un_code: 96
    });
    array.push({
        name: "Bulgaria",
        alpha_2: "BG",
        alpha_3: "BGR",
        un_code: 100
    });
    array.push({
        name: "Burkina Faso",
        alpha_2: "BF",
        alpha_3: "BFA",
        un_code: 854
    });
    array.push({
        name: "Burundi",
        alpha_2: "BI",
        alpha_3: "BDI",
        un_code: 108
    });
    array.push({
        name: "Cambodia",
        alpha_2: "KH",
        alpha_3: "KHM",
        un_code: 116
    });
    array.push({
        name: "Cameroon",
        alpha_2: "CM",
        alpha_3: "CMR",
        un_code: 120
    });
    array.push({
        name: "Canada",
        alpha_2: "CA",
        alpha_3: "CAN",
        un_code: 124
    });
    array.push({
        name: "Cape Verde",
        alpha_2: "CV",
        alpha_3: "CPV",
        un_code: 132
    });
    array.push({
        name: "Cayman Islands",
        alpha_2: "KY",
        alpha_3: "CYM",
        un_code: 136
    });
    array.push({
        name: "Central African Republic",
        alpha_2: "CF",
        alpha_3: "CAF",
        un_code: 140
    });
    array.push({
        name: "Chad",
        alpha_2: "TD",
        alpha_3: "TCD",
        un_code: 148
    });
    array.push({
        name: "Chile",
        alpha_2: "CL",
        alpha_3: "CHL",
        un_code: 152
    });
    array.push({
        name: "China",
        alpha_2: "CN",
        alpha_3: "CHN",
        un_code: 156
    });
    array.push({
        name: "Hong Kong, SAR China",
        alpha_2: "HK",
        alpha_3: "HKG",
        un_code: 344
    });
    array.push({
        name: "Macao, SAR China",
        alpha_2: "MO",
        alpha_3: "MAC",
        un_code: 446
    });
    array.push({
        name: "Christmas Island",
        alpha_2: "CX",
        alpha_3: "CXR",
        un_code: 162
    });
    array.push({
        name: "Cocos (Keeling) Islands",
        alpha_2: "CC",
        alpha_3: "CCK",
        un_code: 166
    });
    array.push({
        name: "Colombia",
        alpha_2: "CO",
        alpha_3: "COL",
        un_code: 170
    });
    array.push({
        name: "Comoros",
        alpha_2: "KM",
        alpha_3: "COM",
        un_code: 174
    });
    array.push({
        name: "Congo (Brazzaville)",
        alpha_2: "CG",
        alpha_3: "COG",
        un_code: 178
    });
    array.push({
        name: "Congo, (Kinshasa)",
        alpha_2: "CD",
        alpha_3: "COD",
        un_code: 180
    });
    array.push({
        name: "Cook Islands",
        alpha_2: "CK",
        alpha_3: "COK",
        un_code: 184
    });
    array.push({
        name: "Costa Rica",
        alpha_2: "CR",
        alpha_3: "CRI",
        un_code: 188
    });
    array.push({
        name: "Côte d'Ivoire",
        alpha_2: "CI",
        alpha_3: "CIV",
        un_code: 384
    });
    array.push({
        name: "Croatia",
        alpha_2: "HR",
        alpha_3: "HRV",
        un_code: 191
    });
    array.push({
        name: "Cuba",
        alpha_2: "CU",
        alpha_3: "CUB",
        un_code: 192
    });
    array.push({
        name: "Cyprus",
        alpha_2: "CY",
        alpha_3: "CYP",
        un_code: 196
    });
    array.push({
        name: "Czech Republic",
        alpha_2: "CZ",
        alpha_3: "CZE",
        un_code: 203
    });
    array.push({
        name: "Denmark",
        alpha_2: "DK",
        alpha_3: "DNK",
        un_code: 208
    });
    array.push({
        name: "Djibouti",
        alpha_2: "DJ",
        alpha_3: "DJI",
        un_code: 262
    });
    array.push({
        name: "Dominica",
        alpha_2: "DM",
        alpha_3: "DMA",
        un_code: 212
    });
    array.push({
        name: "Dominican Republic",
        alpha_2: "DO",
        alpha_3: "DOM",
        un_code: 214
    });
    array.push({
        name: "Ecuador",
        alpha_2: "EC",
        alpha_3: "ECU",
        un_code: 218
    });
    array.push({
        name: "Egypt",
        alpha_2: "EG",
        alpha_3: "EGY",
        un_code: 818
    });
    array.push({
        name: "El Salvador",
        alpha_2: "SV",
        alpha_3: "SLV",
        un_code: 222
    });
    array.push({
        name: "Equatorial Guinea",
        alpha_2: "GQ",
        alpha_3: "GNQ",
        un_code: 226
    });
    array.push({
        name: "Eritrea",
        alpha_2: "ER",
        alpha_3: "ERI",
        un_code: 232
    });
    array.push({
        name: "Estonia",
        alpha_2: "EE",
        alpha_3: "EST",
        un_code: 233
    });
    array.push({
        name: "Ethiopia",
        alpha_2: "ET",
        alpha_3: "ETH",
        un_code: 231
    });
    array.push({
        name: "Falkland Islands (Malvinas)",
        alpha_2: "FK",
        alpha_3: "FLK",
        un_code: 238
    });
    array.push({
        name: "Faroe Islands",
        alpha_2: "FO",
        alpha_3: "FRO",
        un_code: 234
    });
    array.push({
        name: "Fiji",
        alpha_2: "FJ",
        alpha_3: "FJI",
        un_code: 242
    });
    array.push({
        name: "Finland",
        alpha_2: "FI",
        alpha_3: "FIN",
        un_code: 246
    });
    array.push({
        name: "France",
        alpha_2: "FR",
        alpha_3: "FRA",
        un_code: 250
    });
    array.push({
        name: "French Guiana",
        alpha_2: "GF",
        alpha_3: "GUF",
        un_code: 254
    });
    array.push({
        name: "French Polynesia",
        alpha_2: "PF",
        alpha_3: "PYF",
        un_code: 258
    });
    array.push({
        name: "French Southern Territories",
        alpha_2: "TF",
        alpha_3: "ATF",
        un_code: 260
    });
    array.push({
        name: "Gabon",
        alpha_2: "GA",
        alpha_3: "GAB",
        un_code: 266
    });
    array.push({
        name: "Gambia",
        alpha_2: "GM",
        alpha_3: "GMB",
        un_code: 270
    });
    array.push({
        name: "Georgia",
        alpha_2: "GE",
        alpha_3: "GEO",
        un_code: 268
    });
    array.push({
        name: "Germany",
        alpha_2: "DE",
        alpha_3: "DEU",
        un_code: 276
    });
    array.push({
        name: "Ghana",
        alpha_2: "GH",
        alpha_3: "GHA",
        un_code: 288
    });
    array.push({
        name: "Gibraltar",
        alpha_2: "GI",
        alpha_3: "GIB",
        un_code: 292
    });
    array.push({
        name: "Greece",
        alpha_2: "GR",
        alpha_3: "GRC",
        un_code: 300
    });
    array.push({
        name: "Greenland",
        alpha_2: "GL",
        alpha_3: "GRL",
        un_code: 304
    });
    array.push({
        name: "Grenada",
        alpha_2: "GD",
        alpha_3: "GRD",
        un_code: 308
    });
    array.push({
        name: "Guadeloupe",
        alpha_2: "GP",
        alpha_3: "GLP",
        un_code: 312
    });
    array.push({
        name: "Guam",
        alpha_2: "GU",
        alpha_3: "GUM",
        un_code: 316
    });
    array.push({
        name: "Guatemala",
        alpha_2: "GT",
        alpha_3: "GTM",
        un_code: 320
    });
    array.push({
        name: "Guernsey",
        alpha_2: "GG",
        alpha_3: "GGY",
        un_code: 831
    });
    array.push({
        name: "Guinea",
        alpha_2: "GN",
        alpha_3: "GIN",
        un_code: 324
    });
    array.push({
        name: "Guinea-Bissau",
        alpha_2: "GW",
        alpha_3: "GNB",
        un_code: 624
    });
    array.push({
        name: "Guyana",
        alpha_2: "GY",
        alpha_3: "GUY",
        un_code: 328
    });
    array.push({
        name: "Haiti",
        alpha_2: "HT",
        alpha_3: "HTI",
        un_code: 332
    });
    array.push({
        name: "Heard and Mcdonald Islands",
        alpha_2: "HM",
        alpha_3: "HMD",
        un_code: 334
    });
    array.push({
        name: "Holy See (Vatican City State)",
        alpha_2: "VA",
        alpha_3: "VAT",
        un_code: 336
    });
    array.push({
        name: "Honduras",
        alpha_2: "HN",
        alpha_3: "HND",
        un_code: 340
    });
    array.push({
        name: "Hungary",
        alpha_2: "HU",
        alpha_3: "HUN",
        un_code: 348
    });
    array.push({
        name: "Iceland",
        alpha_2: "IS",
        alpha_3: "ISL",
        un_code: 352
    });
    array.push({
        name: "India",
        alpha_2: "IN",
        alpha_3: "IND",
        un_code: 356
    });
    array.push({
        name: "Indonesia",
        alpha_2: "ID",
        alpha_3: "IDN",
        un_code: 360
    });
    array.push({
        name: "Iran, Islamic Republic of",
        alpha_2: "IR",
        alpha_3: "IRN",
        un_code: 364
    });
    array.push({
        name: "Iraq",
        alpha_2: "IQ",
        alpha_3: "IRQ",
        un_code: 368
    });
    array.push({
        name: "Ireland",
        alpha_2: "IE",
        alpha_3: "IRL",
        un_code: 372
    });
    array.push({
        name: "Isle of Man",
        alpha_2: "IM",
        alpha_3: "IMN",
        un_code: 833
    });
    array.push({
        name: "Israel",
        alpha_2: "IL",
        alpha_3: "ISR",
        un_code: 376
    });
    array.push({
        name: "Italy",
        alpha_2: "IT",
        alpha_3: "ITA",
        un_code: 380
    });
    array.push({
        name: "Jamaica",
        alpha_2: "JM",
        alpha_3: "JAM",
        un_code: 388
    });
    array.push({
        name: "Japan",
        alpha_2: "JP",
        alpha_3: "JPN",
        un_code: 392
    });
    array.push({
        name: "Jersey",
        alpha_2: "JE",
        alpha_3: "JEY",
        un_code: 832
    });
    array.push({
        name: "Jordan",
        alpha_2: "JO",
        alpha_3: "JOR",
        un_code: 400
    });
    array.push({
        name: "Kazakhstan",
        alpha_2: "KZ",
        alpha_3: "KAZ",
        un_code: 398
    });
    array.push({
        name: "Kenya",
        alpha_2: "KE",
        alpha_3: "KEN",
        un_code: 404
    });
    array.push({
        name: "Kiribati",
        alpha_2: "KI",
        alpha_3: "KIR",
        un_code: 296
    });
    array.push({
        name: "Korea (North)",
        alpha_2: "KP",
        alpha_3: "PRK",
        un_code: 408
    });
    array.push({
        name: "Korea (South)",
        alpha_2: "KR",
        alpha_3: "KOR",
        un_code: 410
    });
    array.push({
        name: "Kuwait",
        alpha_2: "KW",
        alpha_3: "KWT",
        un_code: 414
    });
    array.push({
        name: "Kyrgyzstan",
        alpha_2: "KG",
        alpha_3: "KGZ",
        un_code: 417
    });
    array.push({
        name: "Lao PDR",
        alpha_2: "LA",
        alpha_3: "LAO",
        un_code: 418
    });
    array.push({
        name: "Latvia",
        alpha_2: "LV",
        alpha_3: "LVA",
        un_code: 428
    });
    array.push({
        name: "Lebanon",
        alpha_2: "LB",
        alpha_3: "LBN",
        un_code: 422
    });
    array.push({
        name: "Lesotho",
        alpha_2: "LS",
        alpha_3: "LSO",
        un_code: 426
    });
    array.push({
        name: "Liberia",
        alpha_2: "LR",
        alpha_3: "LBR",
        un_code: 430
    });
    array.push({
        name: "Libya",
        alpha_2: "LY",
        alpha_3: "LBY",
        un_code: 434
    });
    array.push({
        name: "Liechtenstein",
        alpha_2: "LI",
        alpha_3: "LIE",
        un_code: 438
    });
    array.push({
        name: "Lithuania",
        alpha_2: "LT",
        alpha_3: "LTU",
        un_code: 440
    });
    array.push({
        name: "Luxembourg",
        alpha_2: "LU",
        alpha_3: "LUX",
        un_code: 442
    });
    array.push({
        name: "Macedonia, Republic of",
        alpha_2: "MK",
        alpha_3: "MKD",
        un_code: 807
    });
    array.push({
        name: "Madagascar",
        alpha_2: "MG",
        alpha_3: "MDG",
        un_code: 450
    });
    array.push({
        name: "Malawi",
        alpha_2: "MW",
        alpha_3: "MWI",
        un_code: 454
    });
    array.push({
        name: "Malaysia",
        alpha_2: "MY",
        alpha_3: "MYS",
        un_code: 458
    });
    array.push({
        name: "Maldives",
        alpha_2: "MV",
        alpha_3: "MDV",
        un_code: 462
    });
    array.push({
        name: "Mali",
        alpha_2: "ML",
        alpha_3: "MLI",
        un_code: 466
    });
    array.push({
        name: "Malta",
        alpha_2: "MT",
        alpha_3: "MLT",
        un_code: 470
    });
    array.push({
        name: "Marshall Islands",
        alpha_2: "MH",
        alpha_3: "MHL",
        un_code: 584
    });
    array.push({
        name: "Martinique",
        alpha_2: "MQ",
        alpha_3: "MTQ",
        un_code: 474
    });
    array.push({
        name: "Mauritania",
        alpha_2: "MR",
        alpha_3: "MRT",
        un_code: 478
    });
    array.push({
        name: "Mauritius",
        alpha_2: "MU",
        alpha_3: "MUS",
        un_code: 480
    });
    array.push({
        name: "Mayotte",
        alpha_2: "YT",
        alpha_3: "MYT",
        un_code: 175
    });
    array.push({
        name: "Mexico",
        alpha_2: "MX",
        alpha_3: "MEX",
        un_code: 484
    });
    array.push({
        name: "Micronesia, Federated States of",
        alpha_2: "FM",
        alpha_3: "FSM",
        un_code: 583
    });
    array.push({
        name: "Moldova",
        alpha_2: "MD",
        alpha_3: "MDA",
        un_code: 498
    });
    array.push({
        name: "Monaco",
        alpha_2: "MC",
        alpha_3: "MCO",
        un_code: 492
    });
    array.push({
        name: "Mongolia",
        alpha_2: "MN",
        alpha_3: "MNG",
        un_code: 496
    });
    array.push({
        name: "Montenegro",
        alpha_2: "ME",
        alpha_3: "MNE",
        un_code: 499
    });
    array.push({
        name: "Montserrat",
        alpha_2: "MS",
        alpha_3: "MSR",
        un_code: 500
    });
    array.push({
        name: "Morocco",
        alpha_2: "MA",
        alpha_3: "MAR",
        un_code: 504
    });
    array.push({
        name: "Mozambique",
        alpha_2: "MZ",
        alpha_3: "MOZ",
        un_code: 508
    });
    array.push({
        name: "Myanmar",
        alpha_2: "MM",
        alpha_3: "MMR",
        un_code: 104
    });
    array.push({
        name: "Namibia",
        alpha_2: "NA",
        alpha_3: "NAM",
        un_code: 516
    });
    array.push({
        name: "Nauru",
        alpha_2: "NR",
        alpha_3: "NRU",
        un_code: 520
    });
    array.push({
        name: "Nepal",
        alpha_2: "NP",
        alpha_3: "NPL",
        un_code: 524
    });
    array.push({
        name: "Netherlands",
        alpha_2: "NL",
        alpha_3: "NLD",
        un_code: 528
    });
    array.push({
        name: "Netherlands Antilles",
        alpha_2: "AN",
        alpha_3: "ANT",
        un_code: 530
    });
    array.push({
        name: "New Caledonia",
        alpha_2: "NC",
        alpha_3: "NCL",
        un_code: 540
    });
    array.push({
        name: "New Zealand",
        alpha_2: "NZ",
        alpha_3: "NZL",
        un_code: 554
    });
    array.push({
        name: "Nicaragua",
        alpha_2: "NI",
        alpha_3: "NIC",
        un_code: 558
    });
    array.push({
        name: "Niger",
        alpha_2: "NE",
        alpha_3: "NER",
        un_code: 562
    });
    array.push({
        name: "Nigeria",
        alpha_2: "NG",
        alpha_3: "NGA",
        un_code: 566
    });
    array.push({
        name: "Niue",
        alpha_2: "NU",
        alpha_3: "NIU",
        un_code: 570
    });
    array.push({
        name: "Norfolk Island",
        alpha_2: "NF",
        alpha_3: "NFK",
        un_code: 574
    });
    array.push({
        name: "Northern Mariana Islands",
        alpha_2: "MP",
        alpha_3: "MNP",
        un_code: 580
    });
    array.push({
        name: "Norway",
        alpha_2: "NO",
        alpha_3: "NOR",
        un_code: 578
    });
    array.push({
        name: "Oman",
        alpha_2: "OM",
        alpha_3: "OMN",
        un_code: 512
    });
    array.push({
        name: "Pakistan",
        alpha_2: "PK",
        alpha_3: "PAK",
        un_code: 586
    });
    array.push({
        name: "Palau",
        alpha_2: "PW",
        alpha_3: "PLW",
        un_code: 585
    });
    array.push({
        name: "Palestinian Territory",
        alpha_2: "PS",
        alpha_3: "PSE",
        un_code: 275
    });
    array.push({
        name: "Panama",
        alpha_2: "PA",
        alpha_3: "PAN",
        un_code: 591
    });
    array.push({
        name: "Papua New Guinea",
        alpha_2: "PG",
        alpha_3: "PNG",
        un_code: 598
    });
    array.push({
        name: "Paraguay",
        alpha_2: "PY",
        alpha_3: "PRY",
        un_code: 600
    });
    array.push({
        name: "Peru",
        alpha_2: "PE",
        alpha_3: "PER",
        un_code: 604
    });
    array.push({
        name: "Philippines",
        alpha_2: "PH",
        alpha_3: "PHL",
        un_code: 608
    });
    array.push({
        name: "Pitcairn",
        alpha_2: "PN",
        alpha_3: "PCN",
        un_code: 612
    });
    array.push({
        name: "Poland",
        alpha_2: "PL",
        alpha_3: "POL",
        un_code: 616
    });
    array.push({
        name: "Portugal",
        alpha_2: "PT",
        alpha_3: "PRT",
        un_code: 620
    });
    array.push({
        name: "Puerto Rico",
        alpha_2: "PR",
        alpha_3: "PRI",
        un_code: 630
    });
    array.push({
        name: "Qatar",
        alpha_2: "QA",
        alpha_3: "QAT",
        un_code: 634
    });
    array.push({
        name: "Réunion",
        alpha_2: "RE",
        alpha_3: "REU",
        un_code: 638
    });
    array.push({
        name: "Romania",
        alpha_2: "RO",
        alpha_3: "ROU",
        un_code: 642
    });
    array.push({
        name: "Russian Federation",
        alpha_2: "RU",
        alpha_3: "RUS",
        un_code: 643
    });
    array.push({
        name: "Rwanda",
        alpha_2: "RW",
        alpha_3: "RWA",
        un_code: 646
    });
    array.push({
        name: "Saint-Barthélemy",
        alpha_2: "BL",
        alpha_3: "BLM",
        un_code: 652
    });
    array.push({
        name: "Saint Helena",
        alpha_2: "SH",
        alpha_3: "SHN",
        un_code: 654
    });
    array.push({
        name: "Saint Kitts and Nevis",
        alpha_2: "KN",
        alpha_3: "KNA",
        un_code: 659
    });
    array.push({
        name: "Saint Lucia",
        alpha_2: "LC",
        alpha_3: "LCA",
        un_code: 662
    });
    array.push({
        name: "Saint-Martin (French part)",
        alpha_2: "MF",
        alpha_3: "MAF",
        un_code: 663
    });
    array.push({
        name: "Saint Pierre and Miquelon",
        alpha_2: "PM",
        alpha_3: "SPM",
        un_code: 666
    });
    array.push({
        name: "Saint Vincent and Grenadines",
        alpha_2: "VC",
        alpha_3: "VCT",
        un_code: 670
    });
    array.push({
        name: "Samoa",
        alpha_2: "WS",
        alpha_3: "WSM",
        un_code: 882
    });
    array.push({
        name: "San Marino",
        alpha_2: "SM",
        alpha_3: "SMR",
        un_code: 674
    });
    array.push({
        name: "Sao Tome and Principe",
        alpha_2: "ST",
        alpha_3: "STP",
        un_code: 678
    });
    array.push({
        name: "Saudi Arabia",
        alpha_2: "SA",
        alpha_3: "SAU",
        un_code: 682
    });
    array.push({
        name: "Senegal",
        alpha_2: "SN",
        alpha_3: "SEN",
        un_code: 686
    });
    array.push({
        name: "Serbia",
        alpha_2: "RS",
        alpha_3: "SRB",
        un_code: 688
    });
    array.push({
        name: "Seychelles",
        alpha_2: "SC",
        alpha_3: "SYC",
        un_code: 690
    });
    array.push({
        name: "Sierra Leone",
        alpha_2: "SL",
        alpha_3: "SLE",
        un_code: 694
    });
    array.push({
        name: "Singapore",
        alpha_2: "SG",
        alpha_3: "SGP",
        un_code: 702
    });
    array.push({
        name: "Slovakia",
        alpha_2: "SK",
        alpha_3: "SVK",
        un_code: 703
    });
    array.push({
        name: "Slovenia",
        alpha_2: "SI",
        alpha_3: "SVN",
        un_code: 705
    });
    array.push({
        name: "Solomon Islands",
        alpha_2: "SB",
        alpha_3: "SLB",
        un_code: 90
    });
    array.push({
        name: "Somalia",
        alpha_2: "SO",
        alpha_3: "SOM",
        un_code: 706
    });
    array.push({
        name: "South Africa",
        alpha_2: "ZA",
        alpha_3: "ZAF",
        un_code: 710
    });
    array.push({
        name: "South Georgia and the South Sandwich Islands",
        alpha_2: "GS",
        alpha_3: "SGS",
        un_code: 239
    });
    array.push({
        name: "South Sudan",
        alpha_2: "SS",
        alpha_3: "SSD",
        un_code: 728
    });
    array.push({
        name: "Spain",
        alpha_2: "ES",
        alpha_3: "ESP",
        un_code: 724
    });
    array.push({
        name: "Sri Lanka",
        alpha_2: "LK",
        alpha_3: "LKA",
        un_code: 144
    });
    array.push({
        name: "Sudan",
        alpha_2: "SD",
        alpha_3: "SDN",
        un_code: 736
    });
    array.push({
        name: "Suriname",
        alpha_2: "SR",
        alpha_3: "SUR",
        un_code: 740
    });
    array.push({
        name: "Svalbard and Jan Mayen Islands",
        alpha_2: "SJ",
        alpha_3: "SJM",
        un_code: 744
    });
    array.push({
        name: "Swaziland",
        alpha_2: "SZ",
        alpha_3: "SWZ",
        un_code: 748
    });
    array.push({
        name: "Sweden",
        alpha_2: "SE",
        alpha_3: "SWE",
        un_code: 752
    });
    array.push({
        name: "Switzerland",
        alpha_2: "CH",
        alpha_3: "CHE",
        un_code: 756
    });
    array.push({
        name: "Syrian Arab Republic (Syria)",
        alpha_2: "SY",
        alpha_3: "SYR",
        un_code: 760
    });
    array.push({
        name: "Taiwan, Republic of China",
        alpha_2: "TW",
        alpha_3: "TWN",
        un_code: 158
    });
    array.push({
        name: "Tajikistan",
        alpha_2: "TJ",
        alpha_3: "TJK",
        un_code: 762
    });
    array.push({
        name: "Tanzania, United Republic of",
        alpha_2: "TZ",
        alpha_3: "TZA",
        un_code: 834
    });
    array.push({
        name: "Thailand",
        alpha_2: "TH",
        alpha_3: "THA",
        un_code: 764
    });
    array.push({
        name: "Timor-Leste",
        alpha_2: "TL",
        alpha_3: "TLS",
        un_code: 626
    });
    array.push({
        name: "Togo",
        alpha_2: "TG",
        alpha_3: "TGO",
        un_code: 768
    });
    array.push({
        name: "Tokelau",
        alpha_2: "TK",
        alpha_3: "TKL",
        un_code: 772
    });
    array.push({
        name: "Tonga",
        alpha_2: "TO",
        alpha_3: "TON",
        un_code: 776
    });
    array.push({
        name: "Trinidad and Tobago",
        alpha_2: "TT",
        alpha_3: "TTO",
        un_code: 780
    });
    array.push({
        name: "Tunisia",
        alpha_2: "TN",
        alpha_3: "TUN",
        un_code: 788
    });
    array.push({
        name: "Turkey",
        alpha_2: "TR",
        alpha_3: "TUR",
        un_code: 792
    });
    array.push({
        name: "Turkmenistan",
        alpha_2: "TM",
        alpha_3: "TKM",
        un_code: 795
    });
    array.push({
        name: "Turks and Caicos Islands",
        alpha_2: "TC",
        alpha_3: "TCA",
        un_code: 796
    });
    array.push({
        name: "Tuvalu",
        alpha_2: "TV",
        alpha_3: "TUV",
        un_code: 798
    });
    array.push({
        name: "Uganda",
        alpha_2: "UG",
        alpha_3: "UGA",
        un_code: 800
    });
    array.push({
        name: "Ukraine",
        alpha_2: "UA",
        alpha_3: "UKR",
        un_code: 804
    });
    array.push({
        name: "United Arab Emirates",
        alpha_2: "AE",
        alpha_3: "ARE",
        un_code: 784
    });
    array.push({
        name: "United Kingdom",
        alpha_2: "GB",
        alpha_3: "GBR",
        un_code: 826
    });
    array.push({
        name: "United States of America",
        alpha_2: "US",
        alpha_3: "USA",
        un_code: 840
    });
    array.push({
        name: "US Minor Outlying Islands",
        alpha_2: "UM",
        alpha_3: "UMI",
        un_code: 581
    });
    array.push({
        name: "Uruguay",
        alpha_2: "UY",
        alpha_3: "URY",
        un_code: 858
    });
    array.push({
        name: "Uzbekistan",
        alpha_2: "UZ",
        alpha_3: "UZB",
        un_code: 860
    });
    array.push({
        name: "Vanuatu",
        alpha_2: "VU",
        alpha_3: "VUT",
        un_code: 548
    });
    array.push({
        name: "Venezuela (Bolivarian Republic)",
        alpha_2: "VE",
        alpha_3: "VEN",
        un_code: 862
    });
    array.push({
        name: "Viet Nam",
        alpha_2: "VN",
        alpha_3: "VNM",
        un_code: 704
    });
    array.push({
        name: "Virgin Islands, US",
        alpha_2: "VI",
        alpha_3: "VIR",
        un_code: 850
    });
    array.push({
        name: "Wallis and Futuna Islands",
        alpha_2: "WF",
        alpha_3: "WLF",
        un_code: 876
    });
    array.push({
        name: "Western Sahara",
        alpha_2: "EH",
        alpha_3: "ESH",
        un_code: 732
    });
    array.push({
        name: "Yemen",
        alpha_2: "YE",
        alpha_3: "YEM",
        un_code: 887
    });
    array.push({
        name: "Zambia",
        alpha_2: "ZM",
        alpha_3: "ZMB",
        un_code: 894
    });
    array.push({
        name: "Zimbabwe",
        alpha_2: "ZW",
        alpha_3: "ZWE",
        un_code: 716
    });
};

export function country_name(alpha_code: string, fallback?: string) {
    return (alpha_2_map[alpha_code.toUpperCase()] || {name: fallback || tr("unknown country")}).name;
}

fill_country_infos(country_infos);
for(const country of country_infos)
    alpha_2_map[country.alpha_2] = country;
