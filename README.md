<p align="center">
    <img src="./branding/app-icon.png">
</p>
<p align="center">
    <img src="./branding/storeroom.svg" style="height: 30px" alt="Storeroom">
</p>

<span align="center">

# Universal data store for Homebridge

![Version](https://img.shields.io/github/package-json/v/maxgrafik/homebridge-storeroom)
![Homebridge support](https://img.shields.io/badge/Homebridge-1.8.0_%7C_2.0.0--beta-blue)

</span>


## Description

This [Homebridge](https://homebridge.io) plugin exposes a simple server API to store all kinds of data, variables, etc. to retrieve later. In case you want to e. g. restore the state of a HomeKit accessory after some fancy automation.


## Configuration

```
"platforms": [
    ...
    {
        "platform": "Storeroom",
        "name": "Storeroom",
        "serverPort": <port>,
        "serverSecret": <secret>
    }
]
```

Option | Description
------ | -----------
**serverPort** | Server port (default: 8080)
**serverSecret** | A secret required to access the API (optional)


## Usage

By making simple HTTP requests to your Homebridge server you can either get or set key/value pairs to store whatever (JSON) data. In an automation shortcut you may use `Get contents of URL` to do so. No need for dummy switches anymore.

### Examples

Get all stored JSON data:
```
GET /store HTTP/1.1
Host: <homebridge_ip>:<serverPort>
```

Get the value of the specified key:

```
GET /store?box=<key> HTTP/1.1
Host: <homebridge_ip>:<serverPort>
```

Set key/value pair(s):

```
POST /store HTTP/1.1
Host: <homebridge_ip>:<serverPort>
Content-type: application/json

{ "key": "value", ... }
```

Delete a key and its value:

```
DELETE /store?box=<key> HTTP/1.1
Host: <homebridge_ip>:<serverPort>
```

## Authentication

If you set a **serverSecret** in the config, you need to authenticate each time you access the API (preventing others on your network to mess around with your stored data. Well, unless they know the secret).

For each request without an `Authorization` header the server will respond with a `401 Unauthorized` message containing a nonce in the `WWW-Authenticate` field:

```
WWW-Authenticate: OTP nonce="<nonce>"
```

You create a sha256 hash from this **nonce** and the **serverSecret** and provide it with the next request `hash = SHA256(<nonce>:<serverSecret>)`

```
GET /store HTTP/1.1
Host: <homebridge_ip>:<serverPort>
Authorization: OTP nonce="<nonce>", hash="<hash>"
```

The nonce is valid for 5 minutes and can be used - you guessed it - only once. After each successful request the nonce will be invalidated and you have to retrieve a new one as described.


## Why on earth ...

I know automation shortcuts will look like crap and things can get pretty complicated using this method. But unfortunately HomeKit does not provide a way to store arbitrary data for later use. Some people use dummy switches to achieve similar things, but you may end up having a lot of these littering around in some kind of dummy room.

For personal shortcuts you may store your data in iCloud (which is a lot easier), but automation shortcuts in the Home app only have limited possibilities. That's why.
