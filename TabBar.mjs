import { Component }   from './component'
import { Tab }         from './Tab';


export class TabBar extends Component {
	constructor(...p) {
		super("tabs:$div", ...p, {
			ondragover:(e)=>this.onDragOver(e),
			ondrop:(e)=>this.onDrop(e),
		});
		this.append(new Component({
			tagIDClasses: "filler:$div",
			ondragenter: function(e) {this.classList.add("possibleDropTarget")},
			ondragleave: function(e) {this.classList.remove("possibleDropTarget")},
			ondrop     : function(e) {this.classList.remove("possibleDropTarget")}
		}));
	}

	// pass in the index number, the url, or the tab obj and get the tab obj in return
	getTab(tabID) {
		const type = typeof tabID;
		switch (type) {
			case 'number': return this.tabs[tabID];
			case 'string': for (var tab of this.tabs) if (tab && tab.url == tabID) return tab;
			case 'object': return tabID;
			default:
				throw new Error("typeof tabID is not a 'number', 'string' or 'object' type="+(typeof tabID) );
		}
	}

	addTab(url, label) {
		this.mount(new Tab(url, label, "tabs[]:"), this.filler );
	}
	detachTab(indexOrTab) {
		var tab = this.getTab(indexOrTab);
		this.unmount(tab);
		return tab;
	}
	selectTab(indexOrTab) {
		var tab = this.getTab(indexOrTab);
		for (var i in this.tabs) if (this.tabs[i])
			this.tabs[i].setClass("selected", (tab===this.tabs[i]));
		return tab;
	}
	closeTab(indexOrTab) {
		var tab = this.getTab(indexOrTab);
		tab.destroy();
	}

	onDragOver(event) {
		event.preventDefault();
	}
	onDrop(event) {
		event.preventDefault();
		var tabUrl           = event.dataTransfer.getData("tab/url");
		var originTabBarName = event.dataTransfer.getData("tab/bar");
		var originTabBar     = Component.get(originTabBarName);

		var insertBeforeChild = null, match=null;
		var overName = Component.getMountedName(event.target);
		if (match=/tabs\[(?<index>[0-9]+)\]/.exec(overName) )
			insertBeforeChild = this.tabs[match.groups.index];
		else
			insertBeforeChild = this.filler;

		if (insertBeforeChild && (tabUrl != insertBeforeChild.url)) {
			var tab = originTabBar.detachTab(tabUrl);
			this.mount(tab, insertBeforeChild);
		}
	}
}
