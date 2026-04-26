/** Data source URLs and London geography constants. */

export const ONS_POSTCODE_DIRECTORY_URL =
  "https://www.arcgis.com/sharing/rest/content/items/6a46e14a6c2441e3ab08c7b277335571/data";

export const LAND_REGISTRY_PPD_URL =
  "http://prod.publicdata.landregistry.gov.uk.s3-website-eu-west-1.amazonaws.com/pp-complete.csv";

export const ONS_HPI_API_BASE =
  "https://landregistry.data.gov.uk/data/ukhpi/region";

export const ONS_RENTAL_API_URL =
  "https://www.ons.gov.uk/file?uri=/economy/inflationandpriceindices/datasets/indexofprivatehousingrentalprices/current/indexofprivatehousingrentalprices.csv";

export const POLICE_UK_API_BASE = "https://data.police.uk/api";

export const EPC_API_BASE =
  "https://epc.opendatacommunities.org/api/v1";

/** Inner + outer London outcode prefixes for filtering national datasets. */
export const LONDON_OUTCODE_PREFIXES = [
  // Inner London
  "E",
  "EC",
  "N",
  "NW",
  "SE",
  "SW",
  "W",
  "WC",
  // Outer London
  "BR",
  "CR",
  "DA",
  "EN",
  "HA",
  "IG",
  "KT",
  "RM",
  "SM",
  "TW",
  "UB",
  "WD",
] as const;
