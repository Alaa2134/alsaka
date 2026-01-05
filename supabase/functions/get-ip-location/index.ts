import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface IpLocationRequest {
  ip_address: string;
}

interface IpLocationResponse {
  country?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  error?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { ip_address }: IpLocationRequest = await req.json();

    if (!ip_address) {
      return new Response(
        JSON.stringify({ error: "IP address is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Looking up IP:", ip_address);

    // Use ip-api.com (free, no API key required, 45 requests/minute limit)
    const response = await fetch(`http://ip-api.com/json/${ip_address}?fields=status,message,country,countryCode,city,lat,lon`);
    
    if (!response.ok) {
      throw new Error("Failed to fetch IP location");
    }

    const data = await response.json();

    if (data.status === "fail") {
      console.log("IP lookup failed:", data.message);
      return new Response(
        JSON.stringify({ error: data.message || "IP lookup failed" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result: IpLocationResponse = {
      country: data.country,
      city: data.city,
      latitude: data.lat,
      longitude: data.lon,
    };

    console.log("IP location result:", result);

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error in get-ip-location:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
