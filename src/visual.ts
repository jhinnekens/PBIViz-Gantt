
"use strict";

import "./../style/visual.less";
import powerbi from "powerbi-visuals-api";
import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import IVisual = powerbi.extensibility.visual.IVisual;
import DataView = powerbi.DataView;
import * as moment from 'moment';
import 'moment/locale/pt-br';

import * as d3 from 'd3';
type Selection<T extends d3.BaseType> = d3.Selection<T, any,any, any>;

import DataViewTable = powerbi.DataViewTable;
import DataViewTableRow = powerbi.DataViewTableRow;


import { VisualSettings } from "./settings";
export class Visual implements IVisual {
    private target: HTMLElement;
    private cellsize: number;

    private ganttviewGrid: HTMLElement;
    private todayBar : HTMLElement;
    private todayBarSize: number;

    private vtheaderLastSeries: HTMLElement;
    private vtheader: HTMLElement;

    private vtheaderLastItemName: HTMLElement;
    private vtheaderItemMaxHeight: number;

    private vtheaderSerieLastItemName: HTMLElement;
    private vtheaderSerieItemMaxHeight: number;


    private planningStartDate : moment.Moment;
    private planningEndDate : moment.Moment;
    private cursDate : moment.Moment;
    private dateNow : moment.Moment;

    private totalweekDuration: number;
    private cellheight : number;

    private usedAvailability;

    private nextAvailabilityDayCount;

    private GanttViewSlideContainer : HTMLElement;


   private drilledDown : boolean;

   private drilledCategory : any;
    

    
    private nextAvailabilities;


    private tooltip : HTMLElement;

    private data ;
    


    constructor(options: VisualConstructorOptions) {
       
        this.target = options.element;

        if (document) {


            
            this.planningStartDate = moment('2021-12-01', 'YYYY-MM-DD').locale('en');
            this.planningEndDate = moment('2023-12-01', 'YYYY-MM-DD').locale('en');

            this.dateNow = moment().locale('en');

        
            this.cursDate = moment(this.planningStartDate.locale('en'));
            

            this.cellsize  = 10; // cellsize in PX
            this.cellheight = 32; // cellheight in PX

            this.drilledDown = false;


            this.nextAvailabilityDayCount = 10;

            this.totalweekDuration = this.planningEndDate.diff(this.planningStartDate, 'days');


            
            let startToCurrentMonthStart = moment(this.dateNow.year().toString() + '-' + (this.dateNow.month()  + 1).toString() + '-01', 'YYYY-MM-DD').diff(this.planningStartDate, 'days');


            const GanttDiv: HTMLElement = document.createElement("div");
            GanttDiv.setAttribute("id", "ganttChart");
            GanttDiv.setAttribute("style", "width: 1243px;");

            this.GanttViewSlideContainer  = GanttDiv.appendChild(document.createElement("div"));
            this.GanttViewSlideContainer.classList.add("ganttview-slideContainer");      

            const GanttView : HTMLElement = this.GanttViewSlideContainer.appendChild(document.createElement("div"));
            GanttView.classList.add("ganttview");




            /*Headers */

                this.vtheader  = GanttView.appendChild(document.createElement("div"));
                this.vtheader.classList.add("ganttview-vtheader");

                

            /*Dates */

                const SlideContainer : HTMLElement = GanttView.appendChild(document.createElement("div"));
                SlideContainer.classList.add("ganttview-slide-container");
                SlideContainer.setAttribute("style", "width: 975px;");

                const hzheader : HTMLElement = SlideContainer.appendChild(document.createElement("div"));
                hzheader.classList.add("ganttview-hzheader");

                const hzheaderMonths : HTMLElement = hzheader.appendChild(document.createElement("div"));
                hzheaderMonths.classList.add("ganttview-hzheader-months");
                hzheaderMonths.setAttribute("style", "width: "  + (this.totalweekDuration * this.cellsize).toString() + "px;");
                


                const hzheaderweeks : HTMLElement = hzheader.appendChild(document.createElement("div"));
                hzheaderweeks.classList.add("ganttview-hzheader-weeks");
                hzheaderweeks.setAttribute("style", "width: "  + (this.totalweekDuration * this.cellsize).toString() + "px;");


            /*Content */

            this.ganttviewGrid = SlideContainer.appendChild(document.createElement("div"));
            this.ganttviewGrid.classList.add("ganttview-grid");
            this.ganttviewGrid.setAttribute("style", "width: "  + (this.totalweekDuration * this.cellsize).toString() + "px;");


                var newweek : HTMLElement ;
                var newMonth : HTMLElement; 
               

                var monthLastweek = 'init';
                var firstLoop = true;

                
            // Contol 

            const GanttControl: HTMLElement =  GanttDiv.appendChild(document.createElement("div"));
            GanttControl.classList.add("GanttControl");

            const GanttControlInner: HTMLElement =  GanttControl.appendChild(document.createElement("div"));
            GanttControlInner.classList.add("GanttControl-inner");


            const GanttButtonBack : HTMLElement = GanttControlInner.appendChild(document.createElement("div"));
            GanttButtonBack.classList.add("GanttControl-Button");
            GanttButtonBack.appendChild(document.createTextNode("<"));

            const GanttButtonForward : HTMLElement = GanttControlInner.appendChild(document.createElement("div"));
            GanttButtonForward.classList.add("GanttControl-Button");
            GanttButtonForward.appendChild(document.createTextNode(">"));

            const GanttButtonHome : HTMLElement=  GanttControlInner.appendChild(document.createElement("div"));
            GanttButtonHome.classList.add("GanttControl-Button-home");

            GanttButtonHome.setAttribute("style", "display:none");


    /// Headers 
                while (this.cursDate < this.planningEndDate)
                {

                    //Calculation of the month header
                    if (monthLastweek != this.cursDate.format('MMM'))
                    {
                        monthLastweek = this.cursDate.format('MMM');
                        newMonth = hzheaderMonths.appendChild(document.createElement("div"));
                        newMonth.classList.add("ganttview-hzheader-month");
                        newMonth.setAttribute("style", "width: "  + (this.cursDate.daysInMonth() * this.cellsize -1  ).toString() + "px;");
                        newMonth.appendChild(document.createTextNode(this.cursDate.format('MMMM YYYY')));

                    }

               
                    // Creation of the week scale
                    if (this.cursDate.day() == 1 || (this.cursDate.diff(this.planningStartDate, 'd') < 6 && firstLoop == true  ) )
                    {
                        newweek = hzheaderweeks.appendChild(document.createElement("div"));
                        newweek.classList.add("ganttview-hzheader-week");
                        firstLoop = false;


                        // Calculation of the last week size
                        if (this.planningEndDate.diff(this.cursDate, 'd') < 7)
                        {
                        newweek.setAttribute("style", "width: "  + (  (this.planningEndDate.diff(this.cursDate, 'd')) * this.cellsize - 6).toString() + "px;");
                        newweek.appendChild(document.createTextNode(this.cursDate.week().toString()));
                        }
                        
                        // Standard week
                        else if ( this.cursDate.day() == 1)
                        { 
                        newweek.setAttribute("style", "width: "  + (7 * this.cellsize -6 ).toString() + "px;");
                        newweek.appendChild(document.createTextNode(this.cursDate.format('DD-MMM') + '(' + this.cursDate.week().toString() + ')'));
                        }
                       
                        // Calculation of the first week size (only if it's not a Monday, has otherwise it will be a normal week and this calculation is not required)
                        //First loop allows to not calculate this first week several times
                        else
                        {
                            newweek.setAttribute("style", "width: "  + ( ( 7 - ((this.planningStartDate.day() + 6) % 7 )) * this.cellsize -6 ).toString() + "px;");
                            newweek.appendChild(document.createTextNode(this.cursDate.week().toString()));
                        }
   
                    }

                  

                    this.cursDate = this.cursDate.add(1, 'd');
                }
             
               


                


            this.target.appendChild(GanttDiv);

            let that = this;

            SlideContainer.scrollTo({
                top: 0,
                left: startToCurrentMonthStart * that.cellsize
              });


              var interval;

              GanttButtonHome.onmousedown = () => {
                GanttButtonHome.setAttribute("style", "display:none");

                SlideContainer.scrollTo({
                    top: 0,
                    left: startToCurrentMonthStart * that.cellsize,
                    behavior: "smooth"
                  });
     
              }



              GanttButtonBack.onmousedown = () => {
                GanttButtonHome.setAttribute("style", "display:block");

                interval = setInterval(function() {
                SlideContainer.scrollTo({
                    top: 0,
                    left: SlideContainer.scrollLeft - (that.cellsize)*4
                  }
                  
                  
                  );
            }, 5);
            GanttButtonBack.classList.add('GanttControl-Button-clicked');

            }
        
            GanttButtonBack.onmouseup = () => {
                clearInterval(interval);  
                GanttButtonBack.classList.remove('GanttControl-Button-clicked');
                

                }
    
                GanttButtonForward.onmousedown = () => {
                    GanttButtonHome.setAttribute("style", "display:block");

                    interval = setInterval(function() {
                    SlideContainer.scrollTo({
                        top: 0,
                        left: SlideContainer.scrollLeft + (that.cellsize)*4
                      });
    
                }, 5);
                GanttButtonForward.classList.add('GanttControl-Button-clicked');
                }
            
                GanttButtonForward.onmouseup = () => {
                    clearInterval(interval);  
                    GanttButtonForward.classList.remove('GanttControl-Button-clicked');
                    }

        }
    }

  

    private addMilestoneTask(cellheightCount: number, startDate :moment.Moment, endDate: moment.Moment, isMilestone, level1: string, level2: string, name: string, status)
    {   

        
        this.usedAvailability = undefined;

        let dateStartText = startDate.format("DD MMM YYYY");
        let dateEndText = endDate.format("DD MMM YYYY");

        let endDateWithMarge = endDate;
        endDateWithMarge.add(this.nextAvailabilityDayCount, 'days').format("YYYY-MM-DD");

        if (this.nextAvailabilities.length > 0)
        {

            let i = 0;

            while(i < this.nextAvailabilities.length && !this.usedAvailability)

            {
       
                if (moment(this.nextAvailabilities[i].availability, 'YYYY-MM-DD').isBefore(startDate))
                {

                    this.nextAvailabilities[i].availability = endDateWithMarge;
                    this.usedAvailability = this.nextAvailabilities[i];

                }
                
                i++;
            }

            if (!this.usedAvailability)
            {

                this.usedAvailability = {"rowHeight": this.nextAvailabilities[this.nextAvailabilities.length-1].rowHeight + 1, "availability": endDateWithMarge} ;          
                this.nextAvailabilities.push(this.usedAvailability);  

                this.addLevel2(true, "","");
                this.addARow(false); 
           
            }

        }
        else
        {
            
            this.usedAvailability = {"rowHeight":0, "availability": endDateWithMarge}
            this.nextAvailabilities.push(this.usedAvailability);
        }

        let leftPos = startDate.diff(this.planningStartDate, 'day');

      
        const milestoneTask : HTMLElement = this.ganttviewGrid.appendChild(document.createElement("div"));

        if (isMilestone)

        {   
            milestoneTask.classList.add("ganttview-milestone");

            if (status == 'todo')
            milestoneTask.classList.add('ganttview-milestone-todo');
    
            else if (status == 'late')
            milestoneTask.classList.add('ganttview-milestone-late');
    
            else 
            milestoneTask.classList.add('ganttview-milestone-done');
    
            milestoneTask.setAttribute("style", "left: " + this.cellsize * leftPos + "px;"+ "top:" + (cellheightCount+ this.usedAvailability.rowHeight) * this.cellheight + "px;");    
            
        }

        else
        {
            milestoneTask.classList.add("ganttview-task");

            let duration = endDate.diff(startDate, 'days');

            milestoneTask.setAttribute("style", "left: " + this.cellsize * leftPos + "px;"
            + "top:" + (cellheightCount+ this.usedAvailability.rowHeight) * this.cellheight + "px;"
            + "width:" + (duration*this.cellsize -4) + "px");  /// 4 is padding (2+2)   

            milestoneTask.appendChild(document.createTextNode(name));
            
        }


        let that = this;


        milestoneTask.onmouseover = (d) => { that.addMilestoneTooltip(d, level1, level2, dateStartText, dateEndText, name, isMilestone) } ;
        milestoneTask.onmouseleave = () => this.tooltip.remove();
        
        

    }

    private addLevel1(name : string)
    {

        const vtheaderItem : HTMLElement = this.vtheader.appendChild(document.createElement("div"));
        vtheaderItem.classList.add("ganttview-vtheader-item");

        this.vtheaderItemMaxHeight  = 0;

        const vtheaderItemName : HTMLElement = vtheaderItem.appendChild(document.createElement("div"));
        vtheaderItemName.classList.add("ganttview-vtheader-item-name");
        vtheaderItemName.appendChild(document.createTextNode(name));

        this.vtheaderLastItemName = vtheaderItemName;

        
        const vtheaderLastSeries : HTMLElement = vtheaderItem.appendChild(document.createElement("div"));
        vtheaderLastSeries.classList.add("ganttview-vtheader-series");

        this.vtheaderLastSeries = vtheaderLastSeries;
    }


    private addLevel2(sepOnly : boolean, name: string, nameCat1 : string)
    {

        

        if (!sepOnly)
        {
        this.vtheaderSerieItemMaxHeight = this.cellheight;
        const vtheaderSerieLastItemName = this.vtheaderLastSeries.appendChild(document.createElement("div"));


        vtheaderSerieLastItemName.classList.add("ganttview-vtheader-series-name");

        const vtheaderSerieLastItemNameText = vtheaderSerieLastItemName.appendChild(document.createElement("div"));
        vtheaderSerieLastItemNameText.appendChild(document.createTextNode(name));
        vtheaderSerieLastItemNameText.classList.add("ganttview-vtheader-series-name-Text");

        const vtheaderSerieLastItemNameGlyph = vtheaderSerieLastItemName.appendChild(document.createElement("div"));
       
        vtheaderSerieLastItemNameGlyph.classList.add("ganttview-vtheader-series-name-Glyph");

        
        if (this.drilledCategory && this.drilledCategory.category1 == nameCat1 && this.drilledCategory.category2 == name)
       
        {
            vtheaderSerieLastItemNameGlyph.appendChild(document.createTextNode("-"));
            vtheaderSerieLastItemName.classList.add("ganttview-vtheader-series-name-select");

        }
        else
            vtheaderSerieLastItemNameGlyph.appendChild(document.createTextNode("+"));
        
    



        vtheaderSerieLastItemName.setAttribute("style", "height:" + (this.vtheaderSerieItemMaxHeight-1) + "px");

        let that = this;

        vtheaderSerieLastItemName.onclick = (d) => {

            if (this.drilledDown == false || this.drilledCategory.category1 != nameCat1 || this.drilledCategory.category2 != name)

            {
                this.drilledCategory = {"category1" : nameCat1, "category2" : name};

                this.drilledDown = true; 

                let filteredData = that.data.filter((d) => (d.category2 == name && d.category1 == nameCat1) || d.isMilestone == 1 );
                
                that.createVisualForAsetOfData(that.nestData(filteredData));


                vtheaderSerieLastItemName.lastChild.remove();

            }

            else 
            {
                this.drilledCategory = undefined;
                this.drilledDown = false;
                that.restoreDefaultFilter();
            }
              

          
            {

            }


            
        } ;


        this.vtheaderSerieLastItemName = vtheaderSerieLastItemName;


         }   
         else
         {
              
            this.vtheaderSerieItemMaxHeight += this.cellheight;

            this.vtheaderSerieLastItemName.setAttribute("style", "height:" + (this.vtheaderSerieItemMaxHeight  - 1) + "px");

         }

        this.vtheaderItemMaxHeight += this.cellheight;
        this.vtheaderLastItemName.setAttribute("style", "height:" + this.vtheaderItemMaxHeight + "px");


     


        if (!name)
        name = 'Other';

       // ganttview-vtheader-series-name-border
        

        
    }
    
    private addARow(sep : boolean) {

        let cell :HTMLElement;

        this.cursDate =  moment(this.planningStartDate.locale('en'));


        var ganttviewGridRow : HTMLElement = this.ganttviewGrid.appendChild(document.createElement("div"));
        ganttviewGridRow.classList.add("ganttview-grid-row");   
        ganttviewGridRow.setAttribute("style", "width: "  + (this.totalweekDuration * this.cellsize).toString() + "px;");

        while (this.cursDate < this.planningEndDate)
            {

                //definition of the grid
                cell = ganttviewGridRow.appendChild(document.createElement("div"));
                cell.setAttribute("style", "width: "  + (this.cellsize ).toString() + "px;")
                cell.classList.add("ganttview-grid-row-cell");

                if (sep)
                cell.classList.add("gantview-grid-row-sep");
                else
                cell.classList.add("gantview-grid-row-no-sep");

                    if (this.cursDate.day() == 0 || this.cursDate.day() == 6)
                    {
                        cell.classList.add("ganttview-weekend");
                        
                    }

                    if (this.cursDate.format('YYYY-MM-DD') == this.dateNow.format('YYYY-MM-DD') )
                    {
                        if (!this.todayBar)
                        {
                            this.todayBar = cell.appendChild(document.createElement("div"));
                            this.todayBarSize =  this.cellheight + 0;
                            this.todayBar.setAttribute("style", "height: "+ this.todayBarSize + "px;");
                            this.todayBar.classList.add("todayBar");
                            
                            const todayBarText  = this.todayBar.appendChild(document.createElement("div"));
                            todayBarText.classList.add("todayBar-text");
                            todayBarText.appendChild(document.createTextNode("Today: " + this.dateNow.format('DD-MMM YYYY')));


                        }
                        else
                        {
                            this.todayBarSize += this.cellheight;
                            this.todayBar.setAttribute("style", "height: "+ this.todayBarSize + "px;");                            
                        }

                    
                        
                    }

                this.cursDate = this.cursDate.add(1, 'd');

            }
    }

    private addMilestoneTooltip(event, level1 : string, level2: string, dateStart: string, dateEnd: string, Name: string, isMilestone: boolean)
    {



       this.tooltip =  this.GanttViewSlideContainer.appendChild(document.createElement("div"));
       this.tooltip.classList.add("milestoneTooltip");      

      const tooltipTitle : HTMLElement =  this.tooltip.appendChild(document.createElement("h1"));
       tooltipTitle.appendChild(document.createTextNode(Name));

       const tooltipLine1 : HTMLElement =  this.tooltip .appendChild(document.createElement("div"));

       const tooltipLine1Header : HTMLElement =  tooltipLine1.appendChild(document.createElement("span"));
       tooltipLine1Header.appendChild(document.createTextNode("Level1: "));

       const tooltipLine1Body : HTMLElement =  tooltipLine1.appendChild(document.createElement("span"));
       tooltipLine1Body.appendChild(document.createTextNode(level1));

       const tooltipLine2 : HTMLElement =  this.tooltip .appendChild(document.createElement("div"));

       const tooltipLine2Header : HTMLElement =  tooltipLine2.appendChild(document.createElement("span"));
       tooltipLine2Header.appendChild(document.createTextNode("Level2: "));

       const tooltipLine2Body : HTMLElement =  tooltipLine2.appendChild(document.createElement("span"));
       tooltipLine2Body.appendChild(document.createTextNode(level2));

       const tooltipLine3 : HTMLElement =  this.tooltip .appendChild(document.createElement("div"));

       const tooltipLine3Header : HTMLElement =  tooltipLine3.appendChild(document.createElement("span"));
       tooltipLine3Header.appendChild(document.createTextNode("Date start: "));

       const tooltipLine3Body : HTMLElement =  tooltipLine3.appendChild(document.createElement("span"));
       tooltipLine3Body.appendChild(document.createTextNode(dateStart));

       const tooltipLine4 : HTMLElement =  this.tooltip .appendChild(document.createElement("div"));

       const tooltipLine4Header : HTMLElement =  tooltipLine4.appendChild(document.createElement("span"));
       tooltipLine4Header.appendChild(document.createTextNode("Date finish: "));

       const tooltipLine4Body : HTMLElement =  tooltipLine4.appendChild(document.createElement("span"));
       tooltipLine4Body.appendChild(document.createTextNode(dateEnd));


       let topPosition = 10 + event.clientY - event.offsetY;
       topPosition = Math.min(topPosition, this.GanttViewSlideContainer.clientHeight - this.tooltip.clientHeight -5);
       topPosition = topPosition + this.GanttViewSlideContainer.scrollTop;

      
       let leftPosition = 10 + event.clientX ;

       if (isMilestone)
       leftPosition -=  event.offsetX;

       leftPosition = Math.min(leftPosition, this.GanttViewSlideContainer.clientWidth - this.tooltip.clientWidth -5);


       this.tooltip.setAttribute("style", "top: "  + topPosition + "px;left: "  + leftPosition  + "px;")
     

    }


    private createVisualForAsetOfData(data)
    {
        this.resetVisual();


        let cellheightCount = 0;
    
        data.forEach((d) => 
        {
            this.addLevel1(d.key);
    
            d.values.forEach((e) =>  {
    
                this.addLevel2(false,e.key,d.key);
                this.addARow(true);
    
                this.nextAvailabilities = [];
    
                
                let sortedTable = e.values.sort((a, b) => d3.ascending( 
                    parseInt(moment(a.MilestoneTaskEndDate, 'YYYY-MM-DDTHH:mm:ss').locale('en').format('YYYYMMDD')),
                    parseInt(moment(b.MilestoneTaskStartDate, 'YYYY-MM-DDTHH:mm:ss').locale('en').format('YYYYMMDD'))
                    ));
    
    
                sortedTable.forEach((f) => {
                    let status;
    
                if (f.MilestoneStatus == 100)
                    status = "done";
                
    
                else if (moment( f.MilestoneTaskEndDate, 'YYYY-MM-DDTHH:mm:ss').locale('en').isBefore(this.dateNow))
                    status = "late";
                
                else
                    status = "todo";
                
    
    
                   this.addMilestoneTask( cellheightCount, moment( f.MilestoneTaskStartDate, 'YYYY-MM-DDTHH:mm:ss').locale('en'), moment( f.MilestoneTaskEndDate, 'YYYY-MM-DDTHH:mm:ss').locale('en'), f.isMilestone, f.category1 , f.category2, f.MilestoneTaskName, status);
                } );
    
    
    
    
                cellheightCount+= this.nextAvailabilities.length;
    
                });
                
        }
            
        
        );
    }


    private nestData(data) 
    {

        
        //use d3 to convert table to nested data model
        data = d3.nest()
        .key(function(d : any)  {return d.category1; } )
        .key(function(d : any) {return d.category2; } )
        .entries(data)
        ;

        return data;

    }
              


    public update(options: VisualUpdateOptions) {

    /*************************************************************************************************************** */
    /**** DATA ***************************************************************************************************** */
    /*************************************************************************************************************** */

        const dataView: DataView = options.dataViews[0];
        const tableDataView: DataViewTable = dataView.table;


     

        if (!tableDataView) 
            return;
        


        let TableData = [];

        //creation of a table of objects
        tableDataView.rows.forEach((row: DataViewTableRow) => {

            

            let dataRow : any = {};

          

            dataRow.category1 = row[tableDataView.columns.filter((d) => d.roles.category1 != undefined )[0].index];
            dataRow.category2 = row[tableDataView.columns.filter((d) => d.roles.category2 != undefined )[0].index]; 
            dataRow.MilestoneTaskName = row[tableDataView.columns.filter((d) => d.roles.MilestoneTaskName != undefined )[0].index];
            dataRow.MilestoneTaskStartDate = row[tableDataView.columns.filter((d) => d.roles.MilestoneTaskStartDate != undefined )[0].index];
            dataRow.MilestoneStatus = row[tableDataView.columns.filter((d) => d.roles.MilestoneStatus != undefined )[0].index];
            
            
            //dataRow.isMilestone = row[5];

            dataRow.MilestoneTaskEndDate = row[tableDataView.columns.filter((d) => d.roles.MilestoneTaskEndDate != undefined )[0].index];
            dataRow.MilestoneOrder = row[tableDataView.columns.filter((d) => d.roles.MilestoneOrder != undefined )[0].index];


            if (dataRow.MilestoneTaskStartDate == dataRow.MilestoneTaskEndDate)
                dataRow.isMilestone = true;
            else
                dataRow.isMilestone = false;

            TableData.push(dataRow);
    
          
        });

        TableData = TableData.sort((a,b) => d3.ascending( 
            a.MilestoneOrder,
            b.MilestoneOrder
            ));

        this.data = TableData;
        this.restoreDefaultFilter();

    }

    private restoreDefaultFilter() 
    {
        let filteredData = this.data.filter((d) => d.isMilestone == true);


        this.createVisualForAsetOfData( this.nestData(filteredData));
    }



    private resetVisual()
    {
        
    this.ganttviewGrid.innerHTML = '';
    this.vtheader.innerHTML = '';
    this.todayBar = undefined;
    
    }


}