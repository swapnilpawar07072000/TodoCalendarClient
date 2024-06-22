import  React, { useState,useRef, useEffect } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid' // a plugin!
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from "@fullcalendar/interaction" // needed for dayClick
import listPlugin from '@fullcalendar/list';
import 'bootstrap/dist/css/bootstrap.min.css'; 
import { Button, Modal, ModalHeader, ModalBody, ModalFooter, Input } from "reactstrap";
const moment = require("moment");

var stored_event_list = "";

// const hostname = 'http://localhost:3003'; 
const hostname = 'https://todocalendarserver.onrender.com';

async function getJSONFile(){
    const url = hostname+"/api/getJSONFile";
    const resp = await fetch(url, {
            method: "GET",
            headers: { "Content-Type": "application/json" },
        });
    return (await resp.json());
}

stored_event_list = await getJSONFile();
// console.info(stored_event_list);
if(stored_event_list["data"] === undefined){
    stored_event_list["data"] = {};
}
var stored_list = Object.values((({ last_id, ...o }) => o)(stored_event_list["data"])); //Object.values(stored_event_list);
// console.log(stored_event_list);
// console.log(stored_list);
const initialState = {
        event_list: stored_event_list,
        stored_list: stored_list,
        modal: false,
        title: '',
        description: '',
        startDate: '',
        startTime: '',
        endDate: '',
        endTime: '',
        dateRef: '',
        date_data: [],
        event_id: '',
        updateEvent: '',
    };
// console.log(stored_list);
export default function Calendar() {
    const calendarRef = useRef();
    const [action, setAction] = useState(initialState);
    const [startDate, setStartDate] = useState(new Date());
    const [endDate, setEndDate] = useState(new Date());


    const toggle = (reset='no') => {
        if(reset == 'yes'){
            setAction({...action, modal: !action.modal, title: '', description: '', startDate: '',
                endDate: '', event_id: ''});
        }else{
            setAction({...action, modal: !action.modal});
        }
        // console.log("T "+action.modal);
    }

    function isEmpty(obj) {
        for (const prop in obj) {
          if (Object.hasOwn(obj, prop)) {
            return false;
          }
        }
        return true;
      }

    
    async function updateJSONFile(){
        if(action.event_list["data"] === undefined){
            action.event_list["data"] = {};
        }
        var event_list = action.event_list;
        event_list["last_id"] = stored_event_list.last_id;
        const url = hostname+"/api/updateJSONFile";
        const resp = await fetch(url, {
                method: 'POST',
                headers: { 
                    'Accept': 'application/json, text/plain, */*',
                    "Content-Type": "application/json" },
                body: JSON.stringify(event_list),
            });
        var data = await resp.json();
        var stored_list = Object.values((({ last_id, ...o }) => o)(data["data"]));
        action.stored_list = stored_list;
        stored_event_list = data;
        action.event_list = data;
    }       

    const setEvent = async() => {
        const api = calendarRef.current.getApi();
        var startDate = action.startDate;
        var endDate = action.endDate;
        var event_desc = action.event_list;
        var is_new = false;
        if(action.event_id === undefined || action.event_id === ''){
            is_new = true;
            var last_id = action.event_list.last_id;
            action.event_id = last_id;
        }
        
        var obj = {id: action.event_id, title: action.title, description: action.description, 
            start: (new Date(startDate+"T"+action.startTime)).toISOString(), 
            end: (new Date(endDate+"T"+action.endTime)).toISOString(),
            start_date: new Date(startDate), end_date: new Date(endDate),
            start_time: action.startTime, end_time: action.endTime,
            rendering: 'background', block: true};
        // if(event_desc["data"]===undefined || event_desc["data"][action.event_id] === undefined){
        if(is_new){
            event_desc["data"][action.event_id] = obj;
            setAction({...action, event_list: event_desc, event_id: ''});
            stored_event_list.last_id += 1;
            api.addEvent(obj);
        }else{
            event_desc["data"][action.event_id] = obj;
        }
        getEventList(action.event_list);
        await updateJSONFile();
        // toggle("yes");
    }

    const deleteEventID = async(event_id) => { 
        const event_list = action.event_list;
        const url = hostname+"/api/delete";
        const data = JSON.stringify({"event_data": JSON.stringify(event_list), "event_id":event_id});
        const resp = await fetch(url, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: data,
            })
        const resp_1 = await resp.json();
        // console.log(resp_1);
        const stored_list = Object.values((({ last_id, ...o }) => o)(resp_1["data"]));
        action.stored_list = stored_list;
        action.event_list = resp_1;
        // setAction({...action, event_list: resp_1, stored_list: stored_list});
        toggle("yes");
        // window.location.reload();
    };

    function getEventList(stored_event_list){
        if(stored_event_list["data"] === undefined){
            stored_event_list["data"] = {};
        }
        var stored_list = Object.values((({ last_id, ...o }) => o)(stored_event_list["data"]));
        setAction({...action, stored_list: stored_list});
    }

    const handleEventClick = (args) => {
        var eventInfo = action.event_list["data"][args.event.id];
        var endDate = new Date(eventInfo.end);
        endDate = (endDate.toISOString().split('T')[0]) // +" "+ (endDate.toISOString().split('T')[1]).split('.')[0]);
        var startDate = new Date(eventInfo.start);
        startDate = (startDate.toISOString().split('T')[0]) // +" "+ (startDate.toISOString().split('T')[1]).split('.')[0]);
        setAction({...action, event_id: args.event.id, modal: !action.modal,
            title: eventInfo.title, description: eventInfo.description,
            startDate: startDate, endDate: endDate, startTime: eventInfo.start_time, 
            endTime: eventInfo.end_time, updateEvent: args});
        var eventInfo = action.event_list[args.event.id];
        
    }
    const handleDateClick = (args) => {
        var date = new Date(args.dateStr);
        var startDate = date.toISOString().split('T')[0];
        var endDate = startDate;
        action.event_id = "";
        setAction({...action, modal: !action.modal, date_data: args,
            title: '', description: '', endDate: endDate, 
            startDate: startDate, startTime: "00:00", endTime: "00:00"});
    }

    const handleChange = (event) => {
        const value = event.target.value;
        const name = event.target.name;
        // console.log(name, value);
        setAction({...action, [name]: value});
    };

    let button;
    let deleteButton_ = "";
    if(action.event_id && (action.event_list["data"] !== undefined) && 
        (action.event_list["data"][action.event_id] !== undefined)){
        button = <Button color="primary" onClick={setEvent}>Update</Button>
        deleteButton_ = <Button color="danger" onClick={e => deleteEventID(action.event_id)}>Delete</Button>
    }else{
        button = <Button color="primary" onClick={setEvent}>Add</Button>
        deleteButton_ = "";
    }

    let eventTitle = <p>Add Event</p>;
    let readAbleDate = "";
    if(action.title !== ""){
        eventTitle  = <p>{action.title}</p>;
    }
    if(action.startDate !== ""){
        let startDate = new Date(action.startDate);
        if(startDate == new Date()){
            startDate = (new Date()).toDateString();
        }else{
            startDate = startDate.toDateString();
        }
        // console.log(moment(startDate).format('YYYY/MM/DD hh:mm'));
        readAbleDate = <p>{startDate}</p>
    }

    return (
        <div>
            <FullCalendar
                ref={calendarRef}
                initialView="dayGridMonth"
                headerToolbar={{
                    left: 'prev,next',
                    center: 'title',
                    right: 'dayGridMonth,timeGridWeek,timeGridDay'
                }}
                plugins={[ dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin ]}
                events={action.stored_list || {}}
                eventClick={handleEventClick}
                dateClick={handleDateClick}
            />
            <Modal
                isOpen={action.modal}
                toggle={toggle}
                >
                <ModalHeader toggle={toggle}>
                    {eventTitle}
                    {readAbleDate}
                </ModalHeader>
                <ModalBody>
                    <div>
                        <Input type="text" name="title" placeholder='Please enter Title....' onChange={handleChange} value={action.title || ''} /><br/>
                        <Input type="date"  name="startDate" placeholder='Please select Start Date....' onChange={handleChange} value={action.startDate || ''} /><br/>
                        <Input type="time" name="startTime" placeholder='Please select Start Time....' onChange={handleChange} value={action.startTime || ''} /><br/>
                        <Input type="date" name="endDate" placeholder='Please select End Date....' onChange={handleChange} value={action.endDate || ''} /><br/>
                        <Input type="time" name="endTime" placeholder='Please select End Time....' onChange={handleChange} value={action.endTime || ''} /><br/>
                        <Input type="textarea" name="description" placeholder='Please enter Description....' onChange={handleChange} value={action.description || ''} /><br/>
                        <Input type="hidden" value={action.event_id || ''} />
                    </div>
                </ModalBody>
                <ModalFooter>
                    {button}
                    {deleteButton_}
                    <Button color="secondary" onClick={toggle}>Cancel</Button>
                </ModalFooter>
            </Modal>
        </div>
    );
}
