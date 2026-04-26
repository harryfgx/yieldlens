import { z } from "zod";

export const analyseInputSchema = z.object({
  postcode: z
    .string()
    .regex(/^[A-Z]{1,2}[0-9R][0-9A-Z]? ?[0-9][A-Z]{2}$/i, "Enter a valid UK postcode"),
  bedrooms: z.coerce.number().int().min(1).max(6),
  propertyType: z.enum(["DETACHED", "SEMI_DETACHED", "TERRACED", "FLAT", "OTHER"]),
  askingPrice: z.coerce.number().min(50000, "Min £50,000").max(10000000, "Max £10,000,000"),
  expectedMonthlyRent: z.coerce.number().min(100, "Min £100").max(20000, "Max £20,000"),
  depositPct: z.coerce.number().min(5).max(50).default(25),
  mortgageProductId: z.coerce.number().int().positive("Select a mortgage product"),
});

export type AnalyseInput = z.infer<typeof analyseInputSchema>;
