/*
 * Copyright (C) 2015  Ben Ockmore
 *               2015  Sean Burke
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License along
 * with this program; if not, write to the Free Software Foundation, Inc.,
 * 51 Franklin Street, Fifth Floor, Boston, MA 02110-1301 USA.
 */

const React = require('react');

const Aliases = require('./parts/aliases.jsx');
const RevisionNote = require('./parts/revisionNote.jsx');
const EditionData = require('./parts/editionData.jsx');
const LoadingSpinner = require('../loading_spinner.jsx');

const request = require('superagent');
require('superagent-bluebird-promise');

const Nav = require('react-bootstrap').Nav;
const NavItem = require('react-bootstrap').NavItem;

module.exports = React.createClass({
	displayName: 'editionForm',
	getInitialState() {
		'use strict';

		return {
			tab: 1,
			aliasesValid: true,
			dataValid: true,
			waiting: false
		};
	},
	setTab(tab) {
		'use strict';

		this.setState({
			tab,
			aliasesValid: this.refs.aliases.valid(),
			dataValid: this.refs.data.valid()
		});
	},
	backClick() {
		'use strict';

		this.setTab(this.state.tab - 1);
	},
	nextClick() {
		'use strict';

		this.setTab(this.state.tab + 1);
	},
	handleTab(tabKey) {
		'use strict';

		this.setTab(tabKey);
	},
	handleSubmit(evt) {
		'use strict';

		evt.preventDefault();

		const aliasData = this.refs.aliases.getValue();
		const editionData = this.refs.data.getValue();
		const revisionNote = this.refs.revision.refs.note.getValue();
		const data = {
			aliases: aliasData,
			publication: editionData.publication,
			publisher: editionData.publisher,
			releaseDate: editionData.releaseDate,
			languageId: parseInt(editionData.language),
			editionFormatId: parseInt(editionData.editionFormat),
			editionStatusId: parseInt(editionData.editionStatus),
			disambiguation: editionData.disambiguation,
			annotation: editionData.annotation,
			identifiers: editionData.identifiers,
			pages: parseInt(editionData.pages),
			weight: parseInt(editionData.weight),
			width: parseInt(editionData.width),
			height: parseInt(editionData.height),
			depth: parseInt(editionData.depth),
			note: revisionNote
		};

		this.setState({waiting: true});

		const self = this;
		request.post(this.props.submissionUrl)
			.send(data).promise()
			.then(function(revision) {
				if (!revision.body || !revision.body.entity) {
					window.location.replace('/login');
					return;
				}
				window.location.href = '/edition/' + revision.body.entity.entity_gid;
			})
			.catch(function(err) {
				self.setState({error: err});
			});
	},
	render() {
		'use strict';

		let aliases = null;
		if (this.props.edition) {
			const self = this;
			aliases = this.props.edition.aliases.map(function(alias) {
				return {
					id: alias.id,
					name: alias.name,
					sortName: alias.sort_name,
					language: alias.language ? alias.language.language_id : null,
					primary: alias.primary,
					default: (alias.id === self.props.edition.default_alias.alias_id)
				};
			});
		}

		const submitEnabled = (this.state.aliasesValid && this.state.dataValid);

		const loadingElement = this.state.waiting ? <LoadingSpinner/> : null;

		return (
			<div>
				{loadingElement}

				<Nav
					activeKey={this.state.tab}
					bsStyle="tabs"
					onSelect={this.handleTab}
				>
					<NavItem eventKey={1}>
						<strong>1.</strong> Aliases
						<span className={`text-danger fa fa-warning${this.state.aliasesValid ? ' hidden' : ''}`} />
					</NavItem>
					<NavItem eventKey={2}>
						<strong>2.</strong> Data
						<span className={`text-danger fa fa-warning${this.state.dataValid ? ' hidden' : ''}`} />
					</NavItem>
					<NavItem eventKey={3}>
						<strong>3.</strong> Revision Note
					</NavItem>
				</Nav>


				<form onChange={this.handleChange}>
					<Aliases
						aliases={aliases}
						languages={this.props.languages}
						nextClick={this.nextClick}
						ref="aliases"
						visible={this.state.tab === 1}
					/>
					<EditionData
						backClick={this.backClick}
						edition={this.props.edition}
						editionFormats={this.props.editionFormats}
						editionStatuses={this.props.editionStatuses}
						identifierTypes={this.props.identifierTypes}
						languages={this.props.languages}
						nextClick={this.nextClick}
						publication={this.props.publication}
						publisher={this.props.publisher}
						ref="data"
						visible={this.state.tab === 2}
					/>
					<RevisionNote
						backClick={this.backClick}
						onSubmit={this.handleSubmit}
						ref="revision"
						submitDisabled={!submitEnabled}
						visible={this.state.tab === 3}
					/>
				</form>
			</div>
		);
	}
});
