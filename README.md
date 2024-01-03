# Deus Hex

## Development
Windows 10/11, not tested in linux

Electron project with TS, and a React frontend

Install node / npm, and then install yarn e.g
`npm install -G yarn `

it is using yarn 1.22 - haven't been able to convert to new yarn yet

then run `yarn` in the root of the project

That should be all that is needed. You can run commands from package.json
`start` - this is for everyday dev with code reload etc
`build` - for building everything

Github runs `publish` happen automatically (to a draft release) for every push to `main`.

Auto update for the client should work whenever a draft release is promoted in github to a final release. To test draft releases you can download the setup installer from the release page.

Source code is split into three folders
- main - code for Electron main process
- renderer - the frontend loaded in Electron's Chrome
- common - shared resources used by both

The separation is necessary because while everything is in TS code in `main` will use node specific apis and can break entirely if included in a browser context.

