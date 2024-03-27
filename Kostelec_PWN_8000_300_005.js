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
				var agent = cell.value('agentBiomass');
                if ( Ntrees < 1 & yrl>2){        
                return true;
//				} else if (agent == 0 & yrl > 0) {        
//				return true;
                } else {
                return false;
                }
                }  
        }),          //!!! 1) spreadDelay conditional? Rather spreadFilter!! 2) cut off kernel and background probability 3) onBeforeSpread if Globals.year=1 OR 20 OR 50??  4) Check Impact script
                     //SpreadDelay as a function of biomass, that there is no spread until the agentBiomass reaches a certain threshold. or, once they reach the carerying capacity
					 
    dispersal: new BiteDispersal({      
	kernel: 'exp(-x*x/(2*3.14159*300*300))', //'exp(-x*x/(2*3.14159*500*500))' = negative students t with max 8000,/ 'exp(-0.1478*sqrt(x))'= ALB dispersal kernel
	//if(x<50, 0, xxxxx) one way to create a donut-shaped kernel and drive the agent out of the initial cell.
	//min(xxxxxx, 0.1) Apparently another way
	debugKernel: 'temp/kerneltest_1500m.asc', //raster file for debugging the kernel function
    maxDistance: 8000,  // take maximum landscape size in regard and scale    
    onBeforeSpread: function(bit) {  }  , //function to introduce the agent on first simulation year in a random cell (see below that coordinates are given for landscape centerpoint
	onAfterSpread: function(item) {
				if (Globals.year <2) {
					initialSpread(1, item.grid); console.log("placed one px");
				}
				item.grid.save("temp/Test_dgrid8000_800"+Globals.year+".asc");   }   // makes a grid of the dispersal
		}), 
    
    colonization: new BiteColonization({ 
        dispersalFilter: 'rnd(0,0.05) < (dispersalGrid)', // Heterobasidion example: 'rnd(0,1) < (dispersalGrid)+0.005', 
        treeFilter: 'species=pisy and dbh>=15', // the cell must have Scots pine (Pinus sylvestris) as host with dbh => 15 cm
//		initialAgentBiomass: 2,	// two beetles are needed to colonize a cell. Higher biomass if more colonized cells are adjacent? -> function  cell.value = '
		initialAgentBiomass: function(cell) { return cell.value('dispersalGrid') * 50; }, //related to the spread agentBiomass
		onCalculate: function(cell) { Bite.log(" COLONIZATION!! "); },    
		
		}),
	// higher initialBiomass can be achieved by making it conditional on the value of dispersalGrid. This dispersalGrid must be the value of the one cell.	
    growth: new BiteBiomass({
        hostTrees: '(species=pisy) ', // these trees are the hosts
        hostBiomass: function(cell) {
		var Ntrees = cell.trees.sum('1', 'species=pisy and dbh>15'); //Should count all the living pine trees with dbh>15 in a cell
		Bite.log("total living big trees: "+Ntrees);
		return Ntrees;	
			
		},

       growthFunction: 'K / (1 + ( (K - M) / M)*exp(-r*t))', // logistic growth function, where K=hostbiomass / consumption; M=agentBiomass; r=relative growth rate coefficient; t=time
       
	   growthRateFunction: function (cell) {
     		var grate = Math.log(9); //every infected tree produces 9 infected beetles (cc delaFuente 2018), growth rate is log(9)
		//Bite.log("GROWTH RATE FUNCTION: "+treeskilled  + " rate: " + grate); 
		return grate;
		},
		mortality: 0,
		consumption: 0.5,  // Two infected beetles inoculate one healthy tree, half a tree per one beetle
        growthIterations: 10  //??10-100 iterative rounds of biomass calculation in case the biomass in the cell runs out during the time step
        }),   
	
    impact: new BiteImpact({ 
		impactFilter:'hostBiomass>0',
		impact: [ // filter usceptive trees, define the exact target, set the number of trees relative to number of infected beetles
		{treeFilter: 'species=pisy and dbh>15', target: 'tree', maxTrees: 'agentBiomass/2'
		}]
      }),


	
    output: new BiteOutput({
        outputFilter: "active=true", //this row can be removed to check all cells in BiteTabx, also uncolonized ones
		tableName: 'BiteTabx',
        columns: ['yearsLiving', 'hostBiomass', 'agentImpact', 'agentBiomass']
        
   }),
        

   // onSetup: function(agent) {     //loads the standIds to track in which stand the BITE cell is 
   //     agent.addVariable('tfirst');
   //     var grid = Factory.newGrid();
   //     grid.load('gis/bite.stands.asc');
   //     agent.addVariable(grid, 'standId');
   //    }, // part of the Item
        
   onYearEnd: function(agent) { 
   //   agent.updateVariable('tfirst', function(cell) {
   //         if (cell.value('tfirst')>0) return cell.value('tfirst')+1; // increment
   //         if (cell.cumYearsLiving==1) return 1; // start
   //         return 0; 
   //     });
        agent.saveGrid('yearsLiving', 'temp/pwd1_yliv.asc');
        agent.saveGrid('cumYearsLiving', 'temp/pwd1_cyliv.asc');
   //     agent.saveGrid('tfirst', 'temp/alb_tfirst.asc');
		agent.saveGrid('index', 'temp/pwd_idx.asc');
        agent.saveGrid('active', 'temp/pwd1_active.asc'); }

});

function initialSpread(n, gr) {
  for (var i=0;i<n;++i) {
      var x = 148.5 //one value of a pixel -> colFromX(map, -712250) -> [1] 159 (Kostelec map) for the highest concentration of big pine trees
    var y = 43.5 //one value of a pixel -> rowFromY(map, -1054550) -> [1] 44 (Kostelec map)
    gr.setValue(x,y,1);
   }
}


