var PWD = new BiteAgent({
    name: 'Pinewood nematode', description: "Bursaphelensis xylophilus/Pine wilt disease", 
    cellSize: 100, 
    lifecycle: new BiteLifeCycle({ voltinism: '1', 
                dieAfterDispersal: false, 
                spreadFilter: 'agentBiomass>50', 
                spreadDelay: 0,     // !!! spreadDelay is a number, spreadFilter is a function. 
                spreadInterval: 1,   
                mortality: function(cell) {     
				cell.reloadTrees(); // make sure we have all the trees that are actually there (Werner Rammer 23.09.23)
                var Ntrees = cell.trees.sum('1', 'species=pisy and dbh>=15'); // 'species=pisy and dbh>15'
				var yrl = cell.value('yearsLiving'); 
                if ( Ntrees < 1 & yrl>2){        //When the cell was colonized more than a year ago but there are no more host trees (here: pine trees of 15 cm), the cell dies
                return true;                     //When a cell dies, it can become available again for colonization in later years
                } else {
                return false;
                }
                }  
        }),          
					 
    dispersal: new BiteDispersal({      
	kernel: 'exp(-x*x/(2*3.14159*300*300))', //binomial distribution with x starting at 0, acting as -2Dt function with a Median distance of 300 meters. See examples on BITE wiki for more ideas on possibilities
	//if(x<50, 0, xxxxx) one way to create a donut-shaped kernel and drive the agent out of the initial cell. Not properly tested.
	debugKernel: 'temp/kerneltest_8000m.asc', //raster file for debugging the kernel function, automatically created
    	maxDistance: 8000,  // fixed value, maximum dispersal distance of the kernel, in meters
    	onBeforeSpread: function(bit) {  }  , //function to introduce the agent on first simulation year in a random cell (see below that coordinates are given for landscape center point
	onAfterSpread: function(item) {
				if (Globals.year <2) {
					initialSpread(1, item.grid); console.log("placed one px"); //The initialSpread function was added at the bottom of the script
				}
				item.grid.save("temp/Test_dgrid8000_800"+Globals.year+".asc");   }   // makes an ASCII file of the grid of the dispersal for every year of the run
		}), 
    
    colonization: new BiteColonization({ 
        dispersalFilter: 'rnd(0,0.05) < (dispersalGrid)', // This value can be between 0 and 1
        treeFilter: 'species=pisy and dbh>=15', // the cell must have Scots pine (Pinus sylvestris) as host with dbh => 15 cm
	initialAgentBiomass: function(cell) { return cell.value('dispersalGrid') * 50; }, //related to the spread agentBiomass. Can also be a fixed number
	onCalculate: function(cell) { Bite.log(" COLONIZATION!! "); },   //testing how many times there is colonization 
		
		}),
	// higher initialBiomass can be achieved by making it conditional on the value of dispersalGrid. This dispersalGrid must be the value of the one cell.	
    growth: new BiteBiomass({
        hostTrees: '(species=pisy) ', // these trees are the hosts
        hostBiomass: function(cell) {
		var Ntrees = cell.trees.sum('1', 'species=pisy and dbh>15'); //Should count all the living pine trees with dbh>15 in a cell
		Bite.log("total living big trees: "+Ntrees);
		return Ntrees;	
			
		},

       growthFunction: 'K / (1 + ( (K - M) / M)*exp(-r*t))', // standard logistic growth function, where K=hostbiomass / consumption; M=agentBiomass; r=relative growth rate coefficient; t=time
       
	   growthRateFunction: function (cell) {
     		var grate = Math.log(9); //every infected tree produces 7-12 infected beetles (cc delaFuente 2018), growth rate is log(9)
		return grate;
		},
		mortality: 0,
		consumption: 0.5,  // Two infected beetles inoculate one healthy tree, half a tree per one beetle
        growthIterations: 10  //??10-100 iterative rounds of biomass calculation in case the biomass in the cell runs out during the time step
        }),   
	
    impact: new BiteImpact({ 
		impactFilter:'hostBiomass>0', /only impact when there are host trees in the cell
		impact: [ // filter susceptive trees, define the exact target, set the number of trees relative to number of infected beetles
		{treeFilter: 'species=pisy and dbh>15', target: 'tree', maxTrees: 'agentBiomass/2' //the maximum number of killed trees is the number of infected beetles divided by N
		}]
      }),


	
    output: new BiteOutput({
        outputFilter: "active=true", //this row can be removed to check all cells in BiteTabx, also uncolonized ones
		tableName: 'BiteTabx',
        columns: ['yearsLiving', 'hostBiomass', 'agentImpact', 'agentBiomass']
        
   }),
        
        
   onYearEnd: function(agent) {    //creation of extra ASCII files, the grid 'index' can be used to track the spread of colonized cells in the landscape through time
        agent.saveGrid('yearsLiving', 'temp/pwd1_yliv.asc');
        agent.saveGrid('cumYearsLiving', 'temp/pwd1_cyliv.asc');
	agent.saveGrid('index', 'temp/pwd_idx.asc');
        agent.saveGrid('active', 'temp/pwd1_active.asc'); }

});

function initialSpread(n, gr) {     //This is an adaptation of the function 'randomspread' as used in examples on the BITE wiki. 
  for (var i=0;i<n;++i) {
      var x = 148.5 //one value of a pixel -> colFromX(map, -712250) -> [1] 149 (Kostelec map) for the highest concentration of big pine trees
    var y = 43.5 //one value of a pixel -> rowFromY(map, -1054550) -> [1] 44 (Kostelec map)
    gr.setValue(x,y,1);
   }
}

