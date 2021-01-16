#!/usr/bin/env node

const Alpine = require('alpine')
const commandLineArgs = require('command-line-args')
const fs = require('fs')
const { DateTime } = require('luxon')

// Function to quit and log a message
const quit = (message) => {
  console.log(message)
  process.exit(9)
}

const cliOptions = [
  {name: 'input', defaultOption: true},
]

const cli = commandLineArgs(cliOptions)

try {
  // Ensure we have an input file to parse
  if (typeof cli.input === 'undefined') quit('You must specify an input file.')
  if (!fs.existsSync(cli.input)) quit(`Input file ${cli.input} couldn't be found or doesn't exist.`)

  // Initialize Apache log parser
  const logParser = new Alpine()

  // We'll store our subscriber-related logs in a simple object
  let subscribersByDay = {}

  // Iterate through log to process
  logParser.parseReadStream(
    fs.createReadStream(cli.input, {encoding: 'utf8'})
      .on('end', () => {
        // Iterate through processed stats to display
        console.log(subscribersByDay) // TODO expand this into actually useful stats :)
      }),
    (logLine) => {
      if (logLine['RequestHeader User-agent'].indexOf('subscribers') > -1) {
        let day = DateTime.fromFormat(logLine.time,'dd/MMM/y:HH:mm:ss ZZZ').toFormat('dd-LL-y')
        let host = logLine.remoteHost || ''
        let subscribersObj = logLine['RequestHeader User-agent'].match(/([0-9]+) subscribers/)
        if (!Array.isArray(subscribersObj)) return
        if (typeof subscribersByDay[day] === 'undefined') subscribersByDay[day] = {}
        subscribersByDay[day][logLine.remoteHost] = {
          host,
          subscribers: subscribersObj[1],
          reader: logLine['RequestHeader User-agent']
        }
      }
    })

} catch (err) {
  quit(err)
}
