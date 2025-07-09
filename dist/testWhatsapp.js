"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
const sendWhatsAppTest = async () => {
    const url = "https://graph.facebook.com/v21.0/499509503253094/messages";
    const token = "EAA6TOvKCpz8BO07rmDAZAX8fseAn3IBtOBYhI5PZC4VM3cdJBZCF3ZAkn04Pmw8VKZBjeMErtvllwKhTRQV2BmaTNzOqfPGBwvGBfCBGjP97nmCO7ZBT3tLMnmeZCVITnCMsg0NNCav6eIL3epcOzXbGeagosypI4MsNeVyjYbJQZAv0TnVnIP9uRj7jR0evMZBAItFEpea2sxyDhYBB33jA6HCOAvYUZD";
    const fetch = (await Promise.resolve().then(() => __importStar(require("node-fetch")))).default;
    const body = {
        messaging_product: "whatsapp",
        to: "33760173980",
        type: "template",
        template: {
            name: "hello_world",
            language: { code: "en_US" },
        },
    };
    const response = await fetch(url, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
    });
    const data = await response.json();
    console.log("Response:", data);
};
sendWhatsAppTest();
