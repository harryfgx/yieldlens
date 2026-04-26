export interface DataSource {
  name: string;
  url: string;
  licence: string;
  description: string;
  volume: string;
}

export const dataSources: DataSource[] = [
  {
    name: "HM Land Registry Price Paid Data",
    url: "https://www.gov.uk/government/statistical-data-sets/price-paid-data-downloads",
    licence: "Open Government Licence v3.0",
    description:
      "Property transaction records including sale price, date, address, and property type for England and Wales.",
    volume: "~600K London properties, ~4M transactions",
  },
  {
    name: "ONS House Price Index",
    url: "https://landregistry.data.gov.uk/app/ukhpi",
    licence: "Open Government Licence v3.0",
    description:
      "Monthly house price indices by outcode and region, including average prices and annual percentage changes.",
    volume: "~1,200 rows covering London outcodes",
  },
  {
    name: "ONS Private Rental Prices Index",
    url: "https://www.ons.gov.uk/economy/inflationandpriceindices/bulletins/indexofprivatehousingrentalprices/previousReleases",
    licence: "Open Government Licence v3.0",
    description:
      "Monthly rental price indices by region with monthly and annual percentage changes.",
    volume: "~720 rows",
  },
  {
    name: "data.police.uk Crime Data",
    url: "https://data.police.uk/",
    licence: "Open Government Licence v3.0",
    description:
      "Street-level crime data aggregated by LSOA for Metropolitan and City of London police forces.",
    volume: "~15K rows across 36 months",
  },
  {
    name: "EPC Register",
    url: "https://epc.opendatacommunities.org/",
    licence: "Open Government Licence v3.0",
    description:
      "Energy Performance Certificate data including bedrooms, floor area, EPC rating, and construction age band.",
    volume: "Optional enrichment via API",
  },
  {
    name: "ONS Postcode Directory",
    url: "https://geoportal.statistics.gov.uk/",
    licence: "Open Government Licence v3.0",
    description:
      "Geographic hierarchy mapping postcodes to outcodes, boroughs, regions, and LSOA codes with coordinates.",
    volume: "~180K London postcodes",
  },
  {
    name: "BTL Mortgage Products",
    url: "https://www.themortgageworks.co.uk/",
    licence: "Manual capture",
    description:
      "Buy-to-let mortgage products from 6 major lenders including rates, LTV, fees, and terms.",
    volume: "15 products",
  },
];
