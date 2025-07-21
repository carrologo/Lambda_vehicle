export const corsResponse = (statusCode: number, body: any) => {
    return {
      statusCode,
      headers: {
        // "Access-Control-Allow-Origin": "https://develcarrologo.netlify.app",
        "Access-Control-Allow-Origin": "*",
        "Vary": "Origin",
        "Access-Control-Allow-Headers":
          "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token",
        "Access-Control-Allow-Methods": "OPTIONS,POST,GET,PATCH,DELETE",
      },
      body: JSON.stringify(body),
    };
  };