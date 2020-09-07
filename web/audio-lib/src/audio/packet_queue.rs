#![allow(dead_code)]

use std::task::{Poll, Context, Waker};
use std::collections::VecDeque;
use std::ops::{ Deref };
use std::time::{SystemTime, Duration, UNIX_EPOCH};
use futures::{FutureExt};
use crate::audio::{AudioPacket, PacketId};

#[derive(Debug, PartialEq)]
pub enum AudioPacketQueueEvent {
    AudioPacket(Box<AudioPacket>),
    PacketsLost(
        PacketLostReason /* reason for these packets to be counted as lost*/,
        u16 /* first lost packet id */,
        u16 /* lost packets */
    )
}

#[derive(Debug, PartialEq)]
pub enum PacketLostReason {
    /// The packets have been failed to be received within a certain timeout
    Timeout,
    /// A packet sequence has been found after this packet.
    /// We've declared this packet as lost
    Sequence,
    /// We've enough new packets, which can be replayed.
    /// This is is also the reason if we're resetting the sequence.
    ForceEnqueue
}

#[derive(Debug)]
pub struct AudioPacketQueue {
    /// The window size for packet id clipping.
    /// Must be at least 1!
    pub clipping_window: u16,
    /// Number of packets in a sequence to skip ahead to these packets and count the missing pieces as dropped
    pub skip_sequence_length: u32,
    /// Number of packets in the sequence to forcently replay the first packet
    pub force_enqueue_buffer_length: u32,
    /// Timeout after which a packet will forcently be replayed.
    /// The missing slices will be counted as lost
    pub packet_buffer_timeout: u32,

    /// Max size of the event queue
    pub event_queue_max_size: u32,

    /// Timestamp of the last handled packet
    last_packet_timestamp: i64,
    /// Last packet which has been handled
    last_packet_id: PacketId,

    /// The event waker will be called as soon new events have been scheduled.
    event_waker: Option<Waker>,
    /// The event queue contains all audio queue events which needs to get polled
    event_queue: VecDeque<AudioPacketQueueEvent>,

    /// Buffer for the out of order packets.
    /// The buffer should be at least the capacity of force_enqueue_buffer_length + 1 to prevent
    /// unwanted allocations.
    packet_buffer: VecDeque<EnqueuedPacket>,
    /// A timer which is used for processing non sequence packets after a certain timeout
    packet_buffer_timer: wasm_timer::Delay
}

#[derive(Debug, PartialEq)]
pub enum EnqueueError {
    /// A packet with that id already exists
    PacketAlreadyExists,
    /// The packet is too old
    PacketTooOld,
    /// Containing the current sequence packet id
    PacketSequenceMismatch(PacketId),
    /// Event queue is too long (You need to poll some events first)
    EventQueueOverflow
}

fn current_time_millis() -> i64 {
    #[cfg(target_arch = "wasm32")]
    let value = js_sys::Date::now() as i64;

    #[cfg(not(target_arch = "wasm32"))]
    let value = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_millis() as i64;

    value
}

#[derive(Debug)]
struct EnqueuedPacket {
    /// The actual audio packet
    packet: Box<AudioPacket>,
    /// The timestamp of the enqueueing used for the packet timeout
    enqueue_timestamp: i64
}

impl Deref for EnqueuedPacket {
    type Target = AudioPacket;

    fn deref(&self) -> &Self::Target {
        self.packet.as_ref()
    }
}

impl AudioPacketQueue {
    const DEFAULT_CLIPPING_WINDOW: u16 = 256;

    pub fn new() -> AudioPacketQueue {
        let instance = AudioPacketQueue {
            clipping_window: AudioPacketQueue::DEFAULT_CLIPPING_WINDOW,
            skip_sequence_length: 3,
            force_enqueue_buffer_length: 5,
            packet_buffer_timeout: 50,

            event_queue_max_size: 64,

            /* Decrease by one since we expect the initial packet to be enqueued soonly. */
            last_packet_id: PacketId{ packet_id: 0 },
            last_packet_timestamp: 0,

            packet_buffer: VecDeque::with_capacity(30),
            packet_buffer_timer: wasm_timer::Delay::new(Duration::from_millis(0)),

            event_waker: None,
            event_queue: VecDeque::with_capacity(30)
        };

        instance
    }

    fn test_sequence(&self, packet: &Box<AudioPacket>) -> Result<(), EnqueueError> {
        if !self.last_packet_id.is_less(&packet.packet_id, Some(self.clipping_window)) {
            return Err(EnqueueError::PacketTooOld);
        } else if self.last_packet_id.difference(&packet.packet_id, Some(self.clipping_window)) > 20 {
            return Err(EnqueueError::PacketSequenceMismatch(self.last_packet_id.clone()));
        }

        Ok(())
    }

    fn initialize_sequence(&mut self, packet: &Box<AudioPacket>) {
        self.reset_sequence(false);
        self.last_packet_timestamp = current_time_millis();
        self.last_packet_id = packet.packet_id - 1; /* reduce the last packet id by one so this packet is the next packet */
    }

    /// Enqueue a new audio packet
    pub fn enqueue_packet(&mut self, packet: Box<AudioPacket>, is_head_packet: bool) -> Result<(), EnqueueError> {
        let current_time = current_time_millis();

        /* check if we're expecting a sequence */
        if current_time - self.last_packet_timestamp < 1000 {
            let sequence_result = self.test_sequence(&packet);
            if let Err(error) = sequence_result {
                if !is_head_packet {
                    return Err(error);
                }

                /* enforce a new sequence */
                self.initialize_sequence(&packet);
            }
        } else {
            /* we've a new sequence */
            self.initialize_sequence(&packet);
        }

        let mut index = 0;
        while index < self.packet_buffer.len() {
            let element = &self.packet_buffer[index];
            if !element.packet_id.is_less(&packet.packet_id, Some(self.clipping_window)) {
                break;
            }

            index += 1;
        }

        let packet = EnqueuedPacket{ packet, enqueue_timestamp: current_time };

        if self.event_queue.len() > self.event_queue_max_size as usize {
            return Err(EnqueueError::EventQueueOverflow);
        }

        if index >= self.packet_buffer.len() {
            self.packet_buffer.push_back(packet);
        } else if self.packet_buffer[index].packet_id == packet.packet_id {
            return Err(EnqueueError::PacketAlreadyExists);
        } else {
            self.packet_buffer.insert(index, packet);
        }

        self.try_assemble_packets();

        Ok(())
    }

    /// Reset the current packet sequence.
    /// If you want to enqueue the pending packet buffer, which sequence hasn't been finished yet,
    /// set the first parameter to false
    pub fn reset_sequence(&mut self, drop_pending_buffers: bool) {
        self.last_packet_id = PacketId{ packet_id: 0 };
        self.last_packet_timestamp = 0;
        if drop_pending_buffers {
            self.clear_buffers();
        } else if !self.packet_buffer.is_empty() {
            for packet in self.packet_buffer.drain(..).collect::<Vec<EnqueuedPacket>>() {
                self.advance_last_packet(packet.packet_id.clone(), PacketLostReason::ForceEnqueue);
                self.event_queue.push_back(AudioPacketQueueEvent::AudioPacket(packet.packet));
            }

            if let Some(waker) = &self.event_waker {
                waker.wake_by_ref();
            }
        }
    }

    /// Advance the last packet it to the target packet it.
    /// If the new packet id isn't consecutive to the current one, an PacketsLost event will be enqueued.
    /// The event waker will not be called.
    fn advance_last_packet(&mut self, packet_id: PacketId, drop_reason: PacketLostReason) {
        if self.last_packet_id + 1 != packet_id {
            self.event_queue.push_back(AudioPacketQueueEvent::PacketsLost(
                drop_reason,
                self.last_packet_id.packet_id.wrapping_add(1),
                self.last_packet_id.difference(&packet_id, Some(self.clipping_window)) - 1
            ));
        }
        self.last_packet_id = packet_id;
    }

    /// Clear all pending audio packets
    fn clear_buffers(&mut self) {
        self.packet_buffer.clear();
    }

    /// Get the number of pending events
    pub fn pending_events(&self) -> usize {
        self.event_queue.len()
    }

    /// Get the next event, manly used for testing purposes
    pub fn pop_event(&mut self) -> Option<AudioPacketQueueEvent> {
        self.event_queue.pop_front()
    }

    /// Poll for a events.
    /// This method should be invoked regularly, else not every packet will be processed property.
    pub fn poll_event(&mut self, cx: &mut Context<'_>) -> Poll<AudioPacketQueueEvent> {
        if let Poll::Ready(_) = self.packet_buffer_timer.poll_unpin(cx) {
            self.update_packet_timeouts(Some(cx));
        }

        if let Some(event) = self.pop_event() {
            Poll::Ready(event)
        } else {
            self.event_waker = Some(cx.waker().clone());
            Poll::Pending
        }
    }

    fn try_assemble_packets(&mut self) {
        while let Some(head) = self.packet_buffer.front() {
            if head.packet_id == self.last_packet_id + 1 {
                /* yeah, we received the next packet in the sequence */
                let packet = self.packet_buffer.pop_front().unwrap();
                self.last_packet_id = packet.packet_id;
                self.last_packet_timestamp = current_time_millis();
                self.event_queue.push_back(AudioPacketQueueEvent::AudioPacket(packet.packet));

                if let Some(waker) = &self.event_waker {
                    waker.wake_by_ref();
                }
            } else {
                break;
            }
        }

        if self.packet_buffer.is_empty() {
            return;
        }

        /* test if somewhere are more than three packets in a row */
        {
            let mut index = 0;
            let mut sequence_index = 0;
            let mut sequence_count = 0;
            let mut expected_packet_id = self.packet_buffer.front().unwrap().packet_id;

            while index < self.packet_buffer.len() {
                if self.packet_buffer[index].packet_id != expected_packet_id {
                    sequence_index = index;
                    sequence_count = 1;
                    expected_packet_id = self.packet_buffer[index].packet_id + 1;
                } else {
                    sequence_count += 1;
                    expected_packet_id = expected_packet_id + 1;

                    if sequence_count == self.skip_sequence_length {
                        break;
                    }
                }

                index += 1;
            }

            if sequence_count == self.skip_sequence_length {
                /* okey we can skip */
                /* include the first packet of the sequence */
                let packets: Vec<EnqueuedPacket> = self.packet_buffer.drain(0..(sequence_index + 1)).collect();
                for packet in packets {
                    self.advance_last_packet(packet.packet_id.clone(), PacketLostReason::Sequence);
                    self.event_queue.push_back(AudioPacketQueueEvent::AudioPacket(packet.packet));
                }

                self.last_packet_timestamp = current_time_millis();
                if let Some(waker) = &self.event_waker {
                    waker.wake_by_ref();
                }

                /* now lets replay the next sequence */
                self.try_assemble_packets();
                return;
            } else {
                /* we've no sequence in a row */
            }
        }

        /* force replay first packet, the a bit seek behind mode */
        {
            if self.packet_buffer.len() > self.force_enqueue_buffer_length as usize {
                let packets: Vec<EnqueuedPacket> = self.packet_buffer.drain(0..(self.packet_buffer.len() - self.force_enqueue_buffer_length as usize)).collect();
                for packet in packets {
                    self.advance_last_packet(packet.packet_id.clone(), PacketLostReason::ForceEnqueue);
                    self.event_queue.push_back(AudioPacketQueueEvent::AudioPacket(packet.packet));
                    self.last_packet_timestamp = current_time_millis();
                }
            }
        }

        self.update_packet_timeouts(None);
    }

    fn update_packet_timeouts(&mut self, cx: Option<&mut Context<'_>>) {
        let timeout_time = current_time_millis() - self.packet_buffer_timeout as i64;
        let mut packet_scheduled = false;

        while let Some(head) = self.packet_buffer.front() {
            if timeout_time > head.enqueue_timestamp {
                let packet = self.packet_buffer.pop_front().unwrap();
                self.advance_last_packet(packet.packet_id, PacketLostReason::Timeout);
                self.event_queue.push_back(AudioPacketQueueEvent::AudioPacket(packet.packet));
                packet_scheduled = true;
            }

            break;
        }

        if packet_scheduled {
            if let Some(waker) = &self.event_waker {
                waker.wake_by_ref();
            }
        }

        if let Some(head) = self.packet_buffer.front() {
            let current_time = current_time_millis();
            if let Some(cx) = cx {
                let passed_millis = current_time - head.enqueue_timestamp;
                if passed_millis >= timeout_time {
                    cx.waker().wake_by_ref();
                } else {
                    self.packet_buffer_timer.reset(Duration::from_millis((self.packet_buffer_timeout as i64 - passed_millis) as u64));
                    let _ = self.packet_buffer_timer.poll_unpin(cx);
                }
            }
        }
    }
}

unsafe impl Send for AudioPacketQueue {}

impl Drop for AudioPacketQueue {
    fn drop(&mut self) {
        self.clear_buffers();
    }
}

#[cfg(test)]
mod tests {
    use super::{ AudioPacketQueue, EnqueueError };
    use crate::audio::packet_queue::{AudioPacketQueueEvent, PacketLostReason};
    use tokio::future::poll_fn;
    use tokio_test::block_on;
    use std::sync::{Arc, Mutex};

    use ntest::timeout;
    use crate::audio::{AudioPacket, PacketId, Codec};

    fn enqueue_packet(queue: &mut AudioPacketQueue, packet_id: u16) -> Result<(), EnqueueError> {
        queue.enqueue_packet(Box::new(AudioPacket {
            packet_id: PacketId{ packet_id },
            client_id: 0,
            codec: Codec::Opus,
            payload: vec![]
        }), false)
    }

    fn darin_queued_events(queue: &mut AudioPacketQueue, _expect_events: bool) {
        let mut events_processed = 0;
        while let Some(event) = queue.pop_event() {
            match event {
                AudioPacketQueueEvent::AudioPacket(packet) => {
                    println!("Having an audio packet: {:?}", packet);
                },
                AudioPacketQueueEvent::PacketsLost(reason, first_packet, count) => {
                    println!("{:?} packets got lost due to {:?} (first packet id: {:?})", count, reason, first_packet);
                }
            }

            events_processed += 1;
        }

        if !_expect_events && events_processed > 0 {
            assert!(false, "we haven't expected any events but processed {} events", events_processed);
        }
    }

    fn expect_queued_packet_event(queue: &mut AudioPacketQueue, packet_id: Option<u16>) {
        if let Some(event) = queue.pop_event() {
            match event {
                AudioPacketQueueEvent::AudioPacket(packet) => {
                    if let Some(packet_id) = packet_id {
                        assert_eq!(packet_id, packet.packet_id.packet_id);
                    } else {
                        println!("Having an audio packet: {:?}", packet);
                    }
                },
                _ => {
                    assert!(false, "Expected a packet event");
                }
            }
        } else {
            assert!(false, "expected an event, but there wasn't one");
        }
    }

    #[test]
    //#[timeout(3000)]
    fn queue_insert_0() {
        let mut queue =AudioPacketQueue::new();

        enqueue_packet(&mut queue, 0xFFFC).unwrap();
        //enqueue_packet(&mut queue, 0xFFFF).unwrap();
        //enqueue_packet(&mut queue, 0xFFFD).unwrap();
        enqueue_packet(&mut queue, 0xFFFE).unwrap();
        enqueue_packet(&mut queue, 2).unwrap();
        enqueue_packet(&mut queue, 0).unwrap();
        enqueue_packet(&mut queue, 2).expect_err("packet should be already registered");
        enqueue_packet(&mut queue, 1).unwrap();
        enqueue_packet(&mut queue, 2).expect_err("packet should be already registered");

        expect_queued_packet_event(&mut queue,Some(0xFFFC));
        assert_eq!(queue.pop_event().unwrap(), AudioPacketQueueEvent::PacketsLost(PacketLostReason::Sequence, 0xFFFD, 1));
        expect_queued_packet_event(&mut queue,Some(0xFFFE));
        assert_eq!(queue.pop_event().unwrap(), AudioPacketQueueEvent::PacketsLost(PacketLostReason::Sequence, 0xFFFF, 1));
        expect_queued_packet_event(&mut queue,Some(0));
        expect_queued_packet_event(&mut queue,Some(1));
        expect_queued_packet_event(&mut queue,Some(2));

        darin_queued_events(&mut queue, false);
    }

    #[test]
    fn test_queue_force_window() {
        let mut queue = AudioPacketQueue::new();
        queue.force_enqueue_buffer_length = 5;
        queue.skip_sequence_length = 3;

        enqueue_packet(&mut queue, 0).expect("failed to enqueue packet");
        expect_queued_packet_event(&mut queue, Some(0));

        enqueue_packet(&mut queue, 2).expect("failed to enqueue packet");
        assert_eq!(queue.pop_event(), None);

        enqueue_packet(&mut queue, 4).expect("failed to enqueue packet");
        assert_eq!(queue.pop_event(), None);

        enqueue_packet(&mut queue, 6).expect("failed to enqueue packet");
        assert_eq!(queue.pop_event(), None);

        enqueue_packet(&mut queue, 8).expect("failed to enqueue packet");
        assert_eq!(queue.pop_event(), None);

        enqueue_packet(&mut queue, 10).expect("failed to enqueue packet");
        assert_eq!(queue.pop_event(), None);

        enqueue_packet(&mut queue, 12).expect("failed to enqueue packet");
        assert_eq!(queue.pop_event().unwrap(), AudioPacketQueueEvent::PacketsLost(PacketLostReason::ForceEnqueue, 1, 1));
        expect_queued_packet_event(&mut queue, Some(2));

        enqueue_packet(&mut queue, 13).expect("failed to enqueue packet");
        assert_eq!(queue.pop_event().unwrap(), AudioPacketQueueEvent::PacketsLost(PacketLostReason::ForceEnqueue, 3, 1));
        expect_queued_packet_event(&mut queue, Some(4));

        enqueue_packet(&mut queue, 14).expect("failed to enqueue packet");
        assert_eq!(queue.pop_event().unwrap(), AudioPacketQueueEvent::PacketsLost(PacketLostReason::Sequence, 5, 1));
        expect_queued_packet_event(&mut queue, Some(6));

        assert_eq!(queue.pop_event().unwrap(), AudioPacketQueueEvent::PacketsLost(PacketLostReason::Sequence, 7, 1));
        expect_queued_packet_event(&mut queue, Some(8));

        assert_eq!(queue.pop_event().unwrap(), AudioPacketQueueEvent::PacketsLost(PacketLostReason::Sequence, 9, 1));
        expect_queued_packet_event(&mut queue, Some(10));

        assert_eq!(queue.pop_event().unwrap(), AudioPacketQueueEvent::PacketsLost(PacketLostReason::Sequence, 11, 1));
        expect_queued_packet_event(&mut queue, Some(12));
        expect_queued_packet_event(&mut queue, Some(13));
        expect_queued_packet_event(&mut queue, Some(14));

        darin_queued_events(&mut queue, false);
    }

    #[test]
    #[timeout(500)]
    fn test_queue_packet_timeout() {
        block_on(async {
            let queue = Arc::new(Mutex::new(AudioPacketQueue::new()));

            {
                let mut queue = queue.lock().unwrap();
                enqueue_packet(&mut queue, 0).expect("failed to enqueue packet");
                expect_queued_packet_event(&mut queue, Some(0));
                darin_queued_events(&mut queue, false);

                enqueue_packet(&mut queue, 2).expect("failed to enqueue packet");
                darin_queued_events(&mut queue, false);
            }

            {
                let queue = queue.clone();
                let next_event = poll_fn(move |cx| { queue.lock().unwrap().poll_event(cx) }).await;
                assert_eq!(next_event, AudioPacketQueueEvent::PacketsLost(PacketLostReason::Timeout, 1, 1));
            }

            {
                let mut queue = queue.lock().unwrap();
                darin_queued_events(&mut queue, true);
            }
        });
    }
}