import { Component }                     from './component'
import { Panel, PanelHeader, PanelBody } from './panels'
import { TextEditor, GridDragger }       from './miscellaneous'
import { Disposables }                   from './Disposables'
import { BGError }                       from './BGError'


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// The Initial Sample Data as code text strings

let exampleData = {
	example1: `
		 new Panel(".BGExample", [
		 	new PanelHeader(" Example 1"),
		 	"Woo hoo!"
		 ])
	`,

	example2: `
		 new Panel({
		 	class: "BGExample",
		 	children: [
		 		new PanelHeader(" Example 2"),
		 		"Woo hoo!"
		 	]
		 })
	`,

	panelWithHeaderAndBody: `
		 new Panel({
		 	class: "BGExample",
		 	children: [
		 		new PanelHeader("Panel With Header and Body"),
		 		new PanelBody({
		 			children: [
		 				"Some content..."
		 			]
		 		}),

		 	]
		 })
	`,

	panelWithHeaderAndText: `
		 new Panel({
		 	class: "BGExample",
		 	children: [
		 		new PanelHeader("Panel With Header and Text"),
		 		"Some content..."
		 	]
		 });
	`
}


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// class OneDemoAndCodeView


class OneDemoAndCodeView extends Panel
{
	constructor(name, codeText, ...p)
	{
		super({
			name: name,
			class: "BGOneExample"
		}, ...p);

		this.mount([
			new Component({name:"title", content: "Example "+name}),
			new Panel({name:"demo",  children: eval(codeText)}),
			new TextEditor(codeText, {
				name:         "code",
				scopeName:    'source.js',
				tabIndex:     1,
				onTypingDone: ()=>this.onTypingDone()
			}),
			new Component("errorMsg:$div"),
			new GridDragger("dragger:")
		])
	}

	onChangedDock()
	{
		this.el.style.gridTemplateRows = null;
		this.el.style.gridTemplateColumns = null;
		var cStyles = getComputedStyle(this.dragger.el);
		if ((parseInt(cStyles.width) / parseInt(cStyles.height)) > 1 )
			this.isVert = true;
	}

	onTypingDone()
	{
		try {
			var newDemo = eval("["+this.code.getText()+"]");
			//var newDemo = Function('return '+this.code.getText())();
		} catch (e) {
			this.errorMsg.setLabel(""+e);
			this.code.setClass('syntaxError', true);
			return;
		}
		this.errorMsg.setLabel("");
		this.code.setClass('syntaxError', false);
		this.demo.replaceChildren(newDemo);
	}
}



//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// class BGAtomRedomExamples


export class BGAtomRedomExamples extends Component // Panel
{
	// this is the static Entrypoint that manages a global instance of BGAtomRedomExamples.
	// An atom package can simply import and call BGAtomRedomExamples.Singleton('activate') which registers atom commands that call
	// Singleton with the various cmds.
	static Singleton(cmd='activate', ...args)
	{
		try {
			if (!window.bgAtomRedomExamples && cmd!='deactivate') {
				window.bgAtomRedomExamples = new BGAtomRedomExamples({class: 'BGAtomRedomExamples', tabIndex: 1});
				MixInto(AtomViewMixin, window.bgAtomRedomExamples);
			}

			switch (cmd) {
				case 'activate':
					// nothing to do since we create the instance if needed at the top of this function. If a package does not
					// want to show the example, it can call 'activate' so that the commands get registered
				break;

				case 'deactivate':
					if (window.bgAtomRedomExamples) {
						window.bgAtomRedomExamples.destroy();
						delete window.bgAtomRedomExamples;
					}
				break;

				case 'show':   window.bgAtomRedomExamples.show();   break;
				case 'hide':   window.bgAtomRedomExamples.hide();   break;
				case 'toggle': window.bgAtomRedomExamples.toggle(); break;

				case 'setLocation':
					var location = args[0];
					if (window.bgAtomRedomExamples.location != location) {
						var isShown = window.bgAtomRedomExamples.shown;
						window.bgAtomRedomExamples.hide();

						switch (location) {
							case 'ModalPanel':    bgAtomRedomExamples.paneledParent = bgAtomRedomExamples.plugin.getWorkspace().addModalPanel({   item: bgAtomRedomExamples.el, visible: false, autoFocus: true}); break;
							case 'TopPanel':      bgAtomRedomExamples.paneledParent = bgAtomRedomExamples.plugin.getWorkspace().addTopPanel({     item: bgAtomRedomExamples.el, visible: false}); break;
							case 'BottomPanel':   bgAtomRedomExamples.paneledParent = bgAtomRedomExamples.plugin.getWorkspace().addBottomPanel({  item: bgAtomRedomExamples.el, visible: false}); break;
							case 'LeftPanel':     bgAtomRedomExamples.paneledParent = bgAtomRedomExamples.plugin.getWorkspace().addLeftPanel({    item: bgAtomRedomExamples.el, visible: false}); break;
							case 'RightPanel':    bgAtomRedomExamples.paneledParent = bgAtomRedomExamples.plugin.getWorkspace().addRightPanel({   item: bgAtomRedomExamples.el, visible: false}); break;
							case 'HeaderPanel':   bgAtomRedomExamples.paneledParent = bgAtomRedomExamples.plugin.getWorkspace().addHeaderPanel({  item: bgAtomRedomExamples.el, visible: false}); break;
							case 'FooterPanel':   bgAtomRedomExamples.paneledParent = bgAtomRedomExamples.plugin.getWorkspace().addFooterPanel({  item: bgAtomRedomExamples.el, visible: false}); break;
						}

						this.paneledParent.view = this;
						this.paneledParent.getElement().classList.add('BGAtomRedomExamples')

						window.bgAtomRedomExamples.location = location;

						if (isShown)
							window.bgAtomRedomExamples.show();
					}
				break;
			}
		} catch (e) {
			BGError.logErrorToConsole(e,"Caught in BGAtomRedomExamples.Singleton()")
		}
	}

	constructor(...options)
	{
		super(...options);
		this.disposables = new Disposables();
		this.uri = 'bg://ComponentUIExamples';

		// BGGetPlugin finds the containing plugin application this code is running under or null if its not running in a plugin
		this.plugin = BGGetPlugin();

		this.examplesOrder = [];
		for (const name in exampleData) {
			this.addExample(name, exampleData[name]);
		}

		// init the selection mechanism and select the first example
		this.selectedIndex = null;
		if (this.examplesOrder.length > 0)
			this.selectExample(this.examplesOrder[0]);

		if (this.plugin) {
			this.plugin.getWorkspace().onDidStopChangingActivePaneItem((item)=>{if (item===this) this.onChangedDock(item)})

			this.plugin.addURIOpenner(this.uri, ()=>{return this;} );

			this.plugin.addCommand('BGAtomRedomExamples:show',           ()=>this.show()           );
			this.plugin.addCommand('BGAtomRedomExamples:hide',           ()=>this.hide()           );
			this.plugin.addCommand('BGAtomRedomExamples:selectNext',     ()=>this.selectNext()     );
			this.plugin.addCommand('BGAtomRedomExamples:selectPrevious', ()=>this.selectPrevious() );
		}
	}

	onChangedDock(item, ...p)
	{
		if (item === this)
			for (const name in this.examples) {
				this.examples[name].onChangedDock(item, ...p);
			}
	}

	show()   {
		if (this.paneledParent)
			this.paneledParent.show();
		else
			atom.workspace.open(this.uri)
		this.shown = true;
		this.el.focus();
	}
	hide()   {
		if (this.paneledParent)
			this.paneledParent.hide();
		else
			atom.workspace.hide(this.uri)
		this.shown = false;
	}
	toggle(state) {
		if ((typeof state != 'undefined') ? state : !this.shown)
			this.show();
		else
			this.hide();
	}

	addExample(name, codeText)
	{
		codeText = codeText.replace(/(^\t+ )|(^\n*)|(\s*$)/gm,'');
		this.mount(new OneDemoAndCodeView(
			"examples["+name+"]",
			codeText,
			{display:'none'}
		));
		this.examplesOrder.push(name);
	}

	selectExample(name)
	{
		if (name === null || name === undefined)
			return
		if (!(name in this.examples))
			throw new BGError("name is not found in examples", {name, examples:this.examples, selected:this.selectedIndex});

		if (this.selectedIndex && (this.selectedIndex in this.examples) )
			this.examples[this.selectedIndex].hide();

		this.selectedIndex = name;
		this.examples[this.selectedIndex].show();
		this.examples[this.selectedIndex].focus();
	}

	selectNext()
	{
		var curIndx = -1;
		for (const i=0; i<this.examplesOrder.length && curIndx<0; i++)
			if (this.examplesOrder[i] == this.selectedIndex)
				curIndx = i;
		var newIndx = (curIndx+1) % this.examplesOrder.length;

		this.selectExample(this.examplesOrder[newIndx]);
	}
	selectPrevious()
	{
		var curIndx = -1;
		for (const i=0; i<this.examplesOrder.length && curIndx<0; i++)
			if (this.examplesOrder[i] == this.selectedIndex)
				curIndx = i;
		var newIndx = (curIndx>0) ? (curIndx-1) : (this.examplesOrder.length-1);

		this.selectExample(this.examplesOrder[newIndx]);
	}


	destroy() {
		this.disposables.dispose();
		if (this.paneledParent)
			this.paneledParent.destroy();
		else
			if (this.onDidDestroy)
				this.onDidDestroy();
	}
}

BGAtomRedomExamples.location = ''
