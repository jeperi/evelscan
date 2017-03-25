# EVE LSCAN

EVE L-SCAN is a tool for quickly retrieving some information about people in the local system.

[Screenshot](http://51.15.49.79/newshot.JPG)

Mostly coded for fun as a personal project, but it might be useful for some people.

*DISCLAIMER: THIS TOOL IS A PROTOTYPE AND VERY MUCH IN BETA.*

Much of the planned functionality is non-existing. What exists, works, however.

## How does it work?

The program checks your clipboard periodically and waits for you to copy a set of character names from EVE's local chat window.

If your character's name is found on the clipboard, the program assumes that you have copied the chat window's contact list. The content of the clipboard is then parsed and the resulting list of names is used to query information about the characters from the backend server.
What information does it provide?

    - Character's Name
    - Character's Age
    - Character's Security Status
    - Character's Corporation
    - Character's Alliance
    - Count of Destroyed Ships
    - Count of Lost Ships
    - K/D Ratio
    - Count of Solo Kills
    - Link for quick access to zKillboard for a specific character
    - And the rest is work in progress..

## How do I use it?

Download the program archive and unzip it. Inside you will find a mess of files. The program can be started by running lscan.exe.

The program tries to connect to the backend server and then asks you to provide the name of your character.

The name of your character isn't immediately transmitted anywhere, so feel free to type it in and press proceed.

The program is now ready and you can move it to your second screen (You do have one, right?).

Open EVE Online. Click on the local chat window's contact list and press CTRL+A and then CTRL+C to copy the list to your clipboard.

The program will now start fetching and displaying information about the characters as it comes in.

## License

MIT License

Copyright (c) 2017 jeperi

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

## FAQ

## There's already an app for this!

But I like making everything complicated and therefore decided to code my own.

## Why does the program require my character's name?

It's used for determining whether whatever you happened to copy to your clipboard is the local chat's contact list. This helps to mitigate the possibility of leaking something you'd rather paste in private.

## Is my character's name transmitted somewhere?

Simply put, yes - but not immediately. It's part of the local chat's contact list and is therefore analyzed as well.

However, it's not singled out in a way that's easy to distinguish.

Requests are also cached locally. Your name is therefore transmitted to the server only once per session, making it hard to determine which character belongs to the person querying the data.

Note that removing the name from the list would also make it possible to identify you: if you know who's actually in Jita, it's easy to see whose name is missing from the query.
Why does the program connect to the server in startup?

It's implemented mostly for future use, such as update notifications.

No personally identifiable information is purposefully leaked. The connection consists of a single GET request with no headers apart from the default ones jQuery kindly provides us. You can do the same with your browser by going to http://51.15.49.79/test.

## What information is transmitted?

List of transmitted information (that I know of):

    Your IP-Address (Cannot be worked around, thank however engineered the internet)
    Default headers of the various libraries/frameworks used. (These should not contain anything unique.)
    Characters' names the program finds on your clipboard.

Feel free to observe the communications using something like Fiddler or Wireshark.

## What if I want to keep my clipboard private?

The program checks if the text you have copied on the clipboard contains your character's name (that the program asks for) and only then tries to parse it to a list of names. Therefore other things you might want to use the clipboard for should stay safe, unless they contain your character's name in the correct format, of course. You are responsible for making sure you're not leaking anything you'd rather keep private.
Does this interfere with other programs that use the clipboard?

No, as far as I know. The program only reads the clipboard periodically, and should not prevent any other program from doing the same.

## Why not use the public APIs directly?

Proxy server is a good way to avoid hammering CCP's and zKillboard's servers. Requests are cached and kept around for a long time, reducing the amount of queries on both public APIs. Cache hits are not rate limited, but requests to zKillboard are, and heavily.

Information about characters, corporations and alliances are all cached separately, so there's no need to query for information of the same corporation/alliance multiple times.

Also, I like programming and administering servers.

## Why is the download size of the program so extreme?

A shortcoming of the Electron framework, I'm afraid. It's my first time doing anything with it, and it was a surprise to me too. I will see if I can reduce it in the future.

## This does not work! Who do I yell at?

Preferably nobody, but feedback is always appreciated.
You can contact me via github issues or email (jep@tuta.io).
There's also a reddit thread [here](https://www.reddit.com/r/Eve/comments/60mkw8/new_open_source_tool_up_for_testing_eve_lscan/?ref=share&ref_source=link).

## This works, but I have an idea on how to improve. Who do I yell at?

Check the answer above this one.

## There's something I want to ask.

Refer to the answer above this one.

## Technical details

### Client

The client is built on the Electron framework and is coded in Javascript, HTML and CSS. The interface is done with help from Semantic UI and Vue.js.

This is my first time doing something like this with Electron and in Javascript to boot, so the implementation might not be very elegant.

Requests are cached locally and information about every character gets requested only once per session.

### Server

The backend server is coded in Golang.

The data is really heavily cached and sourced from the free APIs kindly provided by CCP and zKillboard.
