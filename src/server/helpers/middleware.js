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

'use strict';

const Promise = require('bluebird');

const CreatorType = require('../data/properties/creator-type');
const EditionStatus = require('../data/properties/edition-status');
const EditionFormat = require('../data/properties/edition-format');
const Entity = require('../data/entity');
const Gender = require('../data/properties/gender');
const Language = require('../data/properties/language');
const PublicationType = require('../data/properties/publication-type');
const PublisherType = require('../data/properties/publisher-type');
const WorkType = require('../data/properties/work-type');
const IdentifierType = require('../data/properties/identifier-type');

const renderRelationship = require('../helpers/render');

const NotFoundError = require('../helpers/error').NotFoundError;

function makeLoader(model, propName, sortFunc) {
	return function(req, res, next) {
		model.find()
			.then(function(results) {
				if (sortFunc) {
					results = results.sort(sortFunc);
				}

				res.locals[propName] = results;
				next();
			})
			.catch(next);
	};
}

const middleware = {};

middleware.loadCreatorTypes = makeLoader(CreatorType, 'creatorTypes');
middleware.loadPublicationTypes = makeLoader(PublicationType, 'publicationTypes');
middleware.loadEditionFormats = makeLoader(EditionFormat, 'editionFormats');
middleware.loadEditionStatuses = makeLoader(EditionStatus, 'editionStatuses');
middleware.loadPublisherTypes = makeLoader(PublisherType, 'publisherTypes');
middleware.loadWorkTypes = makeLoader(WorkType, 'workTypes');
middleware.loadIdentifierTypes = makeLoader(IdentifierType, 'identifierTypes');

middleware.loadGenders = makeLoader(Gender, 'genders', function(a, b) {
	return a.id > b.id;
});

middleware.loadLanguages = makeLoader(Language, 'languages', function(a, b) {
	if (a.frequency !== b.frequency) {
		return b.frequency - a.frequency;
	}

	return a.name.localeCompare(b.name);
});

middleware.loadEntityRelationships = function(req, res, next) {
	if (!res.locals.entity) {
		next(new Error('Entity failed to load'));
	}

	const entity = res.locals.entity;
	Promise.map(entity.relationships, function(relationship) {
		relationship.template = relationship.relationship_type.template;

		const relEntities = relationship.entities.sort(function sortRelationshipEntity(a, b) {
			return a.position - b.position;
		});

		return Promise.map(relEntities, function(relEntity) {
			return Entity.findOne(relEntity.entity.entity_gid);
		})
			.then(function(loadedEntities) {
				relationship.rendered = renderRelationship(loadedEntities, relationship, null);

				return relationship;
			});
	})
		.then(function(relationships) {
			res.locals.entity.relationships = relationships;

			next();
		})
		.catch(next);
};

middleware.makeEntityLoader = function(model, errMessage) {
	return function(req, res, next, bbid) {
		if (/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/.test(bbid)) {
			const populate = [
				'annotation',
				'disambiguation',
				'relationships',
				'aliases',
				'identifiers'
			];

			// XXX: Don't special case this; instead, let the route specify
			if (model.name === 'Edition') {
				populate.push('publication');
				populate.push('publisher');
			}
			else if (model.name === 'Publication') {
				populate.push('editions');
			}
			else if (model.name === 'Publisher') {
				populate.push('editions');
			}

			model.findOne(req.params.bbid, {populate})
				.then(function(entity) {
					res.locals.entity = entity;

					next();
				})
				.catch(function(err) {
					if (err.status === 404) {
						const newErr = new NotFoundError(errMessage);
						return next(newErr);
					}

					next(err);
				});
		}
		else {
			next('route');
		}
	};
};

module.exports = middleware;
