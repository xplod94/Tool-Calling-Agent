import z from "zod";

export const openUrlOutputSchema = z.object({
    url: z.url(),
    content: z.string().min(1),
});

export type TOpenUrlResult = z.infer<typeof openUrlOutputSchema>;
