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

        let totalSubscribers = {}

        // Iterate over paths
        Object.keys(subscribersByDay).forEach(path => {

          // Display path
          console.log(path)

          // Iterate over days
          Object.keys(subscribersByDay[path]).forEach(day => {

            // Display day
            console.log('  ' + day)

            // Reset subscribes for that day
            let subscribers = 0
            if (typeof totalSubscribers[day] === 'undefined') totalSubscribers[day] = 0
            Object.keys(subscribersByDay[path][day]).forEach(readerHost => {
              let reader = subscribersByDay[path][day][readerHost]
              console.log('    ' + reader.reader + ': ' + reader.subscribers)
              subscribers += reader.subscribers
              totalSubscribers[day] += reader.subscribers
            })
            console.log('Total subscribers: ' + subscribers)
          })
          console.log('\n')
        })
        console.log(totalSubscribers)
      }),
    (logLine) => {
      if (logLine['RequestHeader User-agent'].indexOf('subscribers') > -1) {
        let day = DateTime.fromFormat(logLine.time,'dd/MMM/y:HH:mm:ss ZZZ').toFormat('dd-LL-y')
        let host = logLine.remoteHost || 'unknown'
        let subscribersObj = logLine['RequestHeader User-agent'].match(/([0-9]+) subscribers/)
        let path = logLine.request.split(' ')[1]

        if (!Array.isArray(subscribersObj)) return // If we can't extract the subscribers #, assume invalid
        if (typeof subscribersByDay[path] === 'undefined') subscribersByDay[path] = {}
        if (typeof subscribersByDay[path][day] === 'undefined') subscribersByDay[path][day] = {}

        subscribersByDay[path][day][logLine['RequestHeader User-agent']] = {
          host,
          path,
          subscribers: parseInt(subscribersObj[1]),
          reader: logLine['RequestHeader User-agent']
        }
      }
    })

} catch (err) {
  quit(err)
}
