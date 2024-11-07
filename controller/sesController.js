exports.bounced = async (req, res) => {
  try {
    console.log("Received a request on /ses/bounced endpoint");

    // Ajout de logs pour diagnostiquer le contenu de la requête
    console.log("Request headers:", req.headers);
    console.log("Request body (raw):", req.body);

    const messageType = req.headers["x-amz-sns-message-type"];
    console.log(`Message type received: ${messageType}`);

    // Convertir le corps de la requête en JSON si c'est une chaîne
    if (typeof req.body === "string") {
      try {
        req.body = JSON.parse(req.body);
        console.log("Request body (parsed):", req.body);
      } catch (error) {
        console.error("Erreur lors de la conversion en JSON:", error);
      }
    }

    if (messageType === "SubscriptionConfirmation") {
      const subscribeURL = req.body.SubscribeURL;
      console.log(
        `SubscriptionConfirmation received. SubscribeURL: ${subscribeURL}`,
      );

      if (subscribeURL) {
        const https = require("https");
        https
          .get(subscribeURL, (response) => {
            console.log(
              `Confirmation request sent. Status code: ${response.statusCode}`,
            );

            response.on("data", (d) => {
              process.stdout.write(d);
            });
          })
          .on("error", (e) => {
            console.error(`Error in confirming subscription: ${e.message}`);
          });
      } else {
        console.error("SubscribeURL is undefined.");
      }
    } else {
      console.log("Received a non-confirmation message.");
    }

    res
      .status(200)
      .json({ message: "Bounce endpoint hit successfully", body: req.body });
  } catch (error) {
    console.error("Error in /ses/bounced endpoint:", error);
    res.status(500).json({ message: "Bounce error", error });
  }
};
