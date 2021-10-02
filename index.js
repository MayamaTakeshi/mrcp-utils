const assert = require('assert')
const dm = require('data-matching')


const parse_sdp = (s) => {
    var sdp = {
        media: []
    }
    var lines = s.split("\n")
    var media_id = -1
    lines.forEach(line => {
        var key = line.slice(0,1)
        var val = line.slice(2)
        if(val.slice(-1) == "\r") {
            val = val.slice(0,-1)
        }

        switch(key) {
        case 'c':
            var c = val.split(" ")
            assert(c.length == 3)
            sdp.connection = {
                ip: c[2]
            }
            break
        case 'm':
            var m = val.split(" ")
            var media = m[0]
            if(media == 'application') {
                assert(m.length >= 3)
            } else {
                assert(m.length >= 4)
            }
            media_id++
            sdp.media[media_id] = {
                type: m[0],
                port: parseInt(m[1]),
                protocol: m[2],
                payloads: m.slice(3),
            }
            break
        case 'a':
            var a = val.split(":")
            var k = a[0]
            var v = a[1]
            switch (k) {
            case 'resource':
                sdp.media[media_id].resource = v
                break
            case 'setup':
                sdp.media[media_id].setup = v
                break
            case 'connection':
                sdp.media[media_id].connection = v
                break
            case 'direction':
                sdp.media[media_id].direction = v
                break
            case 'channel':
                sdp.media[media_id].channel = v
                break
            }
        }
    })
    return sdp
}


const gen_offer_sdp = (resource_type, local_rtp_ip, local_rtp_port) => {
    return `v=0
o=mrcp_client 5772550679930491611 4608916746797952899 IN IP4 ${local_rtp_ip}
s=-
c=IN IP4 ${local_rtp_ip}
t=0 0
m=application 9 TCP/MRCPv2 1
a=setup:active
a=connection:new
a=resource:${resource_type}
a=cmid:1
m=audio ${local_rtp_port} RTP/AVP 0
a=rtpmap:0 PCMU/8000
a=${resource_type.endsWith('synth') ? 'recvonly' : 'sendonly'}
a=mid:1`.replace(/\n/g, "\r\n")
}


const gen_answer_sdp = (local_ip, mrcp_port, rtp_port, connection, channel_identifier, resource_type) => {
    return 'v=0\r\n' +
    `o=mrcp_server 1212606071011504954 4868540303632141964 IN IP4 ${local_ip}\r\n` +
    "s=-\r\n" +
    `c=IN IP4 ${local_ip}\r\n` +
    't=0 0\r\n' +
    `m=application ${mrcp_port} TCP/MRCPv2 1\r\n` +
    'a=setup:passive\r\n' +
    `a=connection:${connection}\r\n` +
    `a=channel:${channel_identifier}\r\n` +
    'a=cmid:1\r\n' +
    `m=audio ${rtp_port} RTP/AVP 0\r\n` +
    'a=rtpmap:0 PCMU/8000\r\n' +
    `a=${resource_type.endsWith('synth') ? 'sendonly' : 'recvonly'}\r\n` +
    'a=mid:1\r\n'
}


const offer_sdp_matcher = dm.partial_match({
    connection: { ip: dm.collect('remote_rtp_ip') },
    media: dm.unordered_list([
        {
            type: 'application',
            port: dm.collect('remote_mrcp_port'),
            protocol: 'TCP/MRCPv2',
            resource: dm.collect('resource'),
            connection: dm.collect('connection'),
        },
        {
            type: 'audio',
            port: dm.collect('remote_rtp_port'),
            protocol: 'RTP/AVP',
            payloads: dm.collect("rtp_payloads"),
        }
    ])
})


const answer_sdp_matcher = dm.partial_match({
    connection: { ip: dm.collect('remote_ip') },
    media: dm.unordered_list([
        {
            type: 'application',
            port: dm.collect('remote_mrcp_port'),
            protocol: 'TCP/MRCPv2',
            payloads: ["1"],
            channel: dm.collect('channel'),
        },
        {
            type: 'audio',
            port: dm.collect('remote_rtp_port'),
            protocol: 'RTP/AVP',
            payloads: dm.collect("rtp_payloads"),
        }
    ])
})


module.exports = {
    parse_sdp,

    gen_offer_sdp,
    gen_answer_sdp,

    offer_sdp_matcher,
    answer_sdp_matcher,
}
